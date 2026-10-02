import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { ModaGptTaskRuntime } from '../../src/server/modagptTaskQueue';
import { PrismaModaGptTaskStore } from '../../src/server/prismaModaGptTaskStore';

const databaseUrl = process.env.MODAGPT_TEST_DATABASE_URL;
if (process.env.NODE_ENV !== 'test') throw new Error('MODAGPT_POSTGRES_INTEGRATION_REQUIRES_NODE_ENV_TEST');
if (!databaseUrl) throw new Error('MODAGPT_TEST_DATABASE_URL_REQUIRED');

const parsedTestUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedTestUrl.pathname.replace(/^\//, '').split('/')[0] || '');
if (!/(^|[-_])(test|e2e)([-_]|$)/i.test(databaseName)) {
  throw new Error('MODAGPT_TEST_DATABASE_NAME_MUST_INCLUDE_TEST_OR_E2E');
}
if (process.env.DATABASE_URL) {
  const configuredUrl = new URL(process.env.DATABASE_URL);
  if (configuredUrl.host === parsedTestUrl.host && configuredUrl.pathname === parsedTestUrl.pathname) {
    throw new Error('MODAGPT_TEST_DATABASE_MUST_NOT_MATCH_APPLICATION_DATABASE');
  }
}
if (!['localhost', '127.0.0.1', '::1'].includes(parsedTestUrl.hostname)
  && process.env.ALLOW_REMOTE_MODAGPT_TEST_DATABASE !== 'true') {
  throw new Error('REMOTE_MODAGPT_TEST_DATABASE_REQUIRES_EXPLICIT_OPT_IN');
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const store = new PrismaModaGptTaskStore(prisma);
const runtime = new ModaGptTaskRuntime(store);

test('PostgreSQL enforces tenant idempotency, lease-guarded phases, and expired-lease recovery', async () => {
  const taskIds: string[] = [];
  try {
    const input = {
      taskType: 'ai.workflow.run' as const,
      merchantId: 'modagpt-integration-tenant-a',
      tenantId: 'modagpt-integration-tenant-a',
      actorId: 'modagpt-postgres-integration',
      goal: 'Verify durable task transitions',
      idempotencyKey: `postgres-integration:${crypto.randomUUID()}`,
      payload: { workflow: 'integration_probe' },
      maxAttempts: 3
    };
    const created = await runtime.enqueue(input);
    taskIds.push(created.id);
    assert.equal(created.deduplicated, false);
    const replay = await runtime.enqueue(input);
    assert.equal(replay.id, created.id);
    assert.equal(replay.deduplicated, true);

    await assert.rejects(
      runtime.enqueue({ ...input, payload: { workflow: 'changed_payload' } }),
      /MODAGPT_TASK_IDEMPOTENCY_CONFLICT/
    );

    const otherTenant = await runtime.enqueue({
      ...input,
      merchantId: 'modagpt-integration-tenant-b',
      tenantId: 'modagpt-integration-tenant-b'
    });
    taskIds.push(otherTenant.id);
    assert.notEqual(otherTenant.id, created.id);

    const firstClaim = await store.claim('integration-worker-a', 60_000);
    assert.equal(firstClaim?.id, created.id);
    assert.equal(firstClaim?.status, 'running');
    assert.equal(firstClaim?.attempts, 1);
    const plan = JSON.stringify({
      plan_id: `integration-plan:${created.id}`,
      task_id: created.id,
      trace_id: firstClaim?.traceId,
      tenant_id: firstClaim?.tenantId,
      goal: firstClaim?.goal,
      steps: [{
        step_id: 'verify_queue_store',
        dependencies: [],
        agent: 'business-manager',
        tool: null,
        expected_result: 'Persisted task plan remains tenant and lease bound.',
        risk_level: 'LOW',
        status: 'planned'
      }],
      risk_level: 'LOW',
      status: 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    assert.equal(await store.persistPlan(created.id, 'integration-worker-b', plan), false);
    assert.equal(await store.persistPlan(created.id, 'integration-worker-a', plan), true);
    assert.equal(await store.transition({
      id: created.id,
      expectedStatus: 'running',
      status: 'planning',
      workerId: 'integration-worker-b'
    }), false);
    assert.equal(await store.transition({
      id: created.id,
      expectedStatus: 'running',
      status: 'planning',
      workerId: 'integration-worker-a'
    }), true);
    assert.equal(await store.transition({
      id: created.id,
      expectedStatus: 'planning',
      status: 'verifying',
      workerId: 'integration-worker-a'
    }), true);

    await prisma.modaGptTask.update({
      where: { id: created.id },
      data: { lockedUntil: new Date(Date.now() - 1_000) }
    });
    const recovered = await store.claim('integration-worker-b', 60_000);
    assert.equal(recovered?.id, created.id);
    assert.equal(recovered?.status, 'running');
    assert.equal(recovered?.attempts, 2);
    assert.equal(recovered?.traceId, firstClaim?.traceId);
    assert.equal(recovered?.plan, plan);
    assert.equal(await store.persistPlan(created.id, 'integration-worker-a', '{"stale":true}'), false);
    assert.equal(await store.complete(created.id, 'integration-worker-a', '{"stale":true}', 'completed'), false);
    assert.equal(await store.complete(created.id, 'integration-worker-b', '{"verified":true}', 'completed'), true);

    const persisted = await prisma.modaGptTask.findUnique({
      where: { id: created.id },
      select: { status: true, attempts: true, result: true, lockedBy: true, lockedUntil: true }
    });
    assert.deepEqual(persisted, {
      status: 'completed',
      attempts: 2,
      result: '{"verified":true}',
      lockedBy: null,
      lockedUntil: null
    });
  } finally {
    if (taskIds.length) await prisma.modaGptTask.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.$disconnect();
  }
});
