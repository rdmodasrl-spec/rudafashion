import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionModaGptTask,
  ModaGptTaskRuntime,
  ModaGptTaskQueue,
  modaGptTaskStatuses,
  type ModaGptTask,
  type ModaGptTaskStatus,
  type ModaGptTaskStore,
  type ModaGptTaskType
} from '../src/server/modagptTaskQueue';
import {
  createModaGptEventTaskInput,
  enqueueModaGptEventsInTransaction,
  publishModaGptEvent
} from '../src/server/modagptEvents';
import { startModaGptTaskWorker } from '../src/server/modagptTaskWorker';
import { PrismaModaGptTaskStore } from '../src/server/prismaModaGptTaskStore';

class MemoryTaskStore implements ModaGptTaskStore {
  private nextId = 1;
  readonly phaseChanges: Array<{ id: string; status: ModaGptTaskStatus }> = [];
  private tasks: Array<ModaGptTask<string> & { result?: string; availableAt: number; lockedUntil?: number | null; lastErrorCode?: string }> = [];
  constructor(private readonly now: () => number = Date.now) {}

  async enqueue(input: Parameters<ModaGptTaskStore['enqueue']>[0]): Promise<{ id: string; status: ModaGptTaskStatus; deduplicated: boolean }> {
    const existing = input.idempotencyKey
      ? this.tasks.find(task => task.idempotencyKey === input.idempotencyKey)
      : undefined;
    if (existing) {
      if (
        existing.taskType !== input.taskType
        || existing.merchantId !== input.merchantId
        || existing.payload !== input.payload
      ) throw new Error('MODAGPT_TASK_IDEMPOTENCY_CONFLICT');
      return { id: existing.id, status: existing.status, deduplicated: true };
    }
    const task: ModaGptTask<string> & { availableAt: number } = {
      id: String(this.nextId++),
      merchantId: input.merchantId,
      tenantId: input.tenantId,
      actorId: input.actorId,
      traceId: input.traceId,
      parentTaskId: input.parentTaskId,
      goal: input.goal,
      taskType: input.taskType,
      status: 'queued',
      priority: input.priority,
      agentId: input.agentId,
      payload: input.payload,
      context: input.context,
      plan: input.plan,
      attempts: 0,
      retryCount: 0,
      maxAttempts: input.maxAttempts,
      idempotencyKey: input.idempotencyKey,
      lockedBy: null,
      error: null,
      availableAt: 0
    };
    this.tasks.push(task);
    return { id: task.id, status: task.status, deduplicated: false };
  }

  async claim(workerId: string, leaseMs: number): Promise<ModaGptTask<string> | null> {
    const task = this.tasks.find(item =>
      ((item.status === 'queued' || item.status === 'retrying') && item.availableAt <= this.now())
      || (['planning', 'running', 'verifying'].includes(item.status) && (item.lockedUntil ?? 0) <= this.now())
    );
    if (!task) return null;
    task.status = 'running';
    task.attempts += 1;
    task.lockedBy = workerId;
    task.lockedUntil = this.now() + leaseMs;
    return { ...task };
  }

  async complete(id: string, workerId: string, result: string, status: 'completed' | 'waiting_approval'): Promise<boolean> {
    const task = this.tasks.find(item =>
      item.id === id && ['running', 'verifying'].includes(item.status) && item.lockedBy === workerId
    );
    if (!task) return false;
    task.status = status;
    task.result = result;
    task.lockedBy = null;
    task.lockedUntil = null;
    return true;
  }

  async persistPlan(id: string, workerId: string, plan: string): Promise<boolean> {
    const task = this.tasks.find(item =>
      item.id === id && ['planning', 'running', 'verifying'].includes(item.status) && item.lockedBy === workerId
    );
    if (!task) return false;
    task.plan = plan;
    return true;
  }

  async transition(input: {
    id: string;
    expectedStatus: ModaGptTaskStatus;
    status: ModaGptTaskStatus;
    workerId?: string;
  }): Promise<boolean> {
    const task = this.tasks.find(item => item.id === input.id
      && item.status === input.expectedStatus
      && (!input.workerId || item.lockedBy === input.workerId));
    if (!task) return false;
    task.status = input.status;
    this.phaseChanges.push({ id: input.id, status: input.status });
    if (['waiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled', 'queued', 'retrying'].includes(input.status)) {
      task.lockedBy = null;
      task.lockedUntil = null;
    }
    return true;
  }

  async fail(input: { id: string; workerId: string; errorCode: string; retryAt: Date | null }): Promise<boolean> {
    const task = this.tasks.find(item =>
      item.id === input.id && item.status === 'running' && item.lockedBy === input.workerId
    );
    if (!task) return false;
    task.status = input.retryAt ? 'retrying' : 'dead_letter';
    task.availableAt = input.retryAt?.getTime() ?? Date.now();
    task.lastErrorCode = input.errorCode;
    task.error = { code: input.errorCode };
    if (input.retryAt) task.retryCount += 1;
    task.lockedBy = null;
    task.lockedUntil = null;
    return true;
  }

  get(id: string) {
    return this.tasks.find(task => task.id === id);
  }
}

test('queue validates payloads and deduplicates repeated requests with an idempotency key', async () => {
  const store = new MemoryTaskStore();
  const queue = new ModaGptTaskQueue(store);
  const input = { taskType: 'ai.event' as const, payload: { event: 'inventory.low' }, idempotencyKey: 'evt:123' };

  const first = await queue.enqueue(input);
  const replay = await queue.enqueue(input);
  assert.equal(first.deduplicated, false);
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.id, first.id);
  const otherTenant = await queue.enqueue({ ...input, merchantId: 'merchant-2', tenantId: 'merchant-2' });
  assert.notEqual(otherTenant.id, first.id);
  await assert.rejects(
    queue.enqueue({ ...input, payload: { event: 'order.created' } }),
    /MODAGPT_TASK_IDEMPOTENCY_CONFLICT/
  );
  await assert.rejects(
    queue.enqueue({ taskType: 'ai.event', payload: 'x'.repeat(65_537) }),
    /MODAGPT_TASK_PAYLOAD_INVALID/
  );
  await assert.rejects(
    queue.enqueue({ taskType: 'not.allowed' as ModaGptTaskType, payload: {} }),
    /MODAGPT_TASK_TYPE_INVALID/
  );
  await assert.rejects(
    queue.enqueue({ ...input, merchantId: 'merchant-1', tenantId: 'merchant-2' }),
    /MODAGPT_TASK_TENANT_MISMATCH/
  );
});

test('worker executes a task, stores only JSON results, and is idempotent after completion', async () => {
  const store = new MemoryTaskStore();
  const queue = new ModaGptTaskRuntime(store);
  const task = await queue.enqueue({
    taskType: 'ops.health_check',
    tenantId: 'merchant-1',
    actorId: 'actor-1',
    traceId: 'trace-1',
    parentTaskId: 'parent-1',
    goal: 'Check service health',
    priority: 10,
    agentId: 'business-manager',
    payload: { probe: true },
    context: { locale: 'zh-CN' },
    plan: { steps: ['probe'] }
  });
  let executions = 0;

  assert.equal(task.status, 'queued');
  assert.equal(await queue.runOne('worker-a', {
    'ops.health_check': async job => {
      executions += 1;
      assert.equal(job.tenantId, 'merchant-1');
      assert.equal(job.actorId, 'actor-1');
      assert.equal(job.traceId, 'trace-1');
      assert.equal(job.parentTaskId, 'parent-1');
      assert.deepEqual(job.context, { locale: 'zh-CN' });
      assert.deepEqual(job.plan, { steps: ['probe'] });
      return { taskId: job.id, healthy: true };
    }
  }), 'completed');
  assert.equal(executions, 1);
  assert.equal(store.get(task.id)?.status, 'completed');
  assert.equal(store.get(task.id)?.result, JSON.stringify({ taskId: task.id, healthy: true }));
  assert.equal(await queue.runOne('worker-a', { 'ops.health_check': async () => ({ healthy: true }) }), 'idle');
});

test('task handlers persist planning, execution, verification, and replan phases under the active lease', async () => {
  const store = new MemoryTaskStore();
  const queue = new ModaGptTaskRuntime(store);
  const task = await queue.enqueue({ taskType: 'ai.workflow.run', payload: {} });
  assert.equal(await queue.runOne('worker-a', {
    'ai.workflow.run': async (_job, execution) => {
      await execution.setPhase('planning');
      await execution.persistPlan({
        plan_id: `plan:${task.id}`,
        task_id: task.id,
        tenant_id: 'tenant-a',
        goal: 'Test plan persistence',
        steps: [{
          step_id: 'execute_and_verify',
          dependencies: [],
          agent: 'business-manager',
          tool: 'get_sales',
          expected_result: 'Persisted plan is owned by the current lease.',
          risk_level: 'LOW',
          status: 'planned'
        }],
        status: 'planning'
      });
      await execution.setPhase('running');
      await execution.setPhase('verifying');
      await execution.setPhase('planning');
      await execution.setPhase('running');
      await execution.setPhase('verifying');
      return { verified: true };
    }
  }), 'completed');
  assert.deepEqual(
    store.phaseChanges.filter(change => change.id === task.id).map(change => change.status),
    ['planning', 'running', 'verifying', 'planning', 'running', 'verifying']
  );
  assert.equal(store.get(task.id)?.status, 'completed');
  assert.deepEqual(JSON.parse(String(store.get(task.id)?.plan)), {
    plan_id: `plan:${task.id}`,
    task_id: task.id,
    tenant_id: 'tenant-a',
    goal: 'Test plan persistence',
    steps: [{
      step_id: 'execute_and_verify',
      dependencies: [],
      agent: 'business-manager',
      tool: 'get_sales',
      expected_result: 'Persisted plan is owned by the current lease.',
      risk_level: 'LOW',
      status: 'planned'
    }],
    status: 'planning'
  });
});

test('worker retries with a bounded delay, then moves terminal failures to the dead-letter state', async () => {
  let now = 1_000;
  const store = new MemoryTaskStore(() => now);
  const queue = new ModaGptTaskQueue(store, () => now);
  const task = await queue.enqueue({ taskType: 'ai.workflow.run', payload: {}, maxAttempts: 2 });
  const fail = { 'ai.workflow.run': async () => { throw new Error('PROVIDER_UNAVAILABLE'); } };

  assert.equal(await queue.runOne('worker-a', fail), 'retrying');
  assert.equal(store.get(task.id)?.lastErrorCode, 'PROVIDER_UNAVAILABLE');
  now += 1_000;
  assert.equal(await queue.runOne('worker-a', fail), 'dead_letter');
  assert.equal(store.get(task.id)?.status, 'dead_letter');
  assert.equal(store.get(task.id)?.lastErrorCode, 'PROVIDER_UNAVAILABLE');
});

test('a worker restart reclaims an expired task lease without losing task identity', async () => {
  let now = 5_000;
  const store = new MemoryTaskStore(() => now);
  const queue = new ModaGptTaskRuntime(store, () => now);
  const task = await queue.enqueue({
    taskType: 'ai.workflow.run',
    tenantId: 'merchant-1',
    actorId: 'actor-1',
    traceId: 'trace-recovery',
    goal: 'Resume after worker restart',
    merchantId: 'merchant-1',
    payload: { version: 1 }
  });
  const abandonedLease = await store.claim('worker-old', 1_000);
  assert.equal(abandonedLease?.status, 'running');
  assert.equal(abandonedLease?.attempts, 1);
  store.get(task.id)!.status = 'planning';

  now += 1_001;
  const recoveredLease = await store.claim('worker-new', 1_000);
  assert.equal(recoveredLease?.id, task.id);
  assert.equal(recoveredLease?.lockedBy, 'worker-new');
  assert.equal(recoveredLease?.attempts, 2);
  assert.equal(recoveredLease?.traceId, 'trace-recovery');
  assert.equal(recoveredLease?.goal, 'Resume after worker restart');
  assert.equal(await queue.transitionTask(task.id, 'running', 'verifying', 'worker-new'), true);
  now += 1_001;
  const verificationRecovery = await store.claim('worker-final', 1_000);
  assert.equal(verificationRecovery?.id, task.id);
  assert.equal(verificationRecovery?.attempts, 3);
});

test('worker rejects invalid leases and reports loss of task ownership', async () => {
  const store = new MemoryTaskStore();
  const queue = new ModaGptTaskQueue(store);
  await assert.rejects(queue.runOne('worker-a', {}, 100), /MODAGPT_TASK_LEASE_INVALID/);
  await assert.rejects(queue.runOne('bad worker', {}), /MODAGPT_WORKER_ID_INVALID/);

  const losingStore: ModaGptTaskStore = {
    enqueue: store.enqueue.bind(store),
    claim: async workerId => ({
      id: 'lost', merchantId: null, tenantId: null, actorId: null, traceId: 'trace-lost',
      parentTaskId: null, goal: 'lost', taskType: 'ops.health_check', status: 'running', priority: 0,
      agentId: null, payload: '{}', context: {}, plan: null, attempts: 1, retryCount: 0,
      maxAttempts: 1, idempotencyKey: null, lockedBy: workerId, error: null
    }),
    persistPlan: async () => false,
    complete: async () => false,
    transition: async () => false,
    fail: async () => false
  };
  await assert.rejects(
    new ModaGptTaskQueue(losingStore).runOne('worker-a', {
      'ops.health_check': async () => ({ ok: true })
    }),
    /MODAGPT_TASK_LEASE_LOST/
  );
});

test('approval results pause tasks and an approved child task resolves its parent', async () => {
  const store = new MemoryTaskStore();
  const runtime = new ModaGptTaskRuntime(store);
  const parent = await runtime.enqueue({ taskType: 'ai.workflow.run', merchantId: 'merchant-1', payload: { step: 'draft' } });

  assert.equal(await runtime.runOne('worker-a', {
    'ai.workflow.run': async () => ({ status: 'approval_required', approvalRequired: true })
  }), 'waiting_approval');
  assert.equal(store.get(parent.id)?.status, 'waiting_approval');

  const child = await runtime.enqueue({
    taskType: 'ai.workflow.run',
    merchantId: 'merchant-1',
    parentTaskId: parent.id,
    payload: { step: 'approved_execution' }
  });
  assert.equal(await runtime.runOne('worker-b', {
    'ai.workflow.run': async () => ({ status: 'published', approvalRequired: false })
  }), 'completed');
  assert.equal(store.get(child.id)?.status, 'completed');
  assert.equal(store.get(parent.id)?.status, 'completed');
});

test('task runtime rejects illegal persisted transitions and supports approval cancellation', async () => {
  const store = new MemoryTaskStore();
  const runtime = new ModaGptTaskRuntime(store);
  const task = await runtime.enqueue({ taskType: 'ai.workflow.run', merchantId: 'merchant-1', payload: {} });
  await assert.rejects(runtime.transitionTask(task.id, 'queued', 'running'), /MODAGPT_TASK_WORKER_REQUIRED/);
  assert.equal(await runtime.runOne('worker-a', {
    'ai.workflow.run': async () => ({ approvalRequired: true })
  }), 'waiting_approval');
  assert.equal(await runtime.transitionTask(task.id, 'waiting_approval', 'cancelled'), true);
  await assert.rejects(runtime.transitionTask(task.id, 'cancelled', 'queued'), /MODAGPT_TASK_TRANSITION_INVALID/);
});

test('task runtime exposes only the canonical states and rejects illegal transitions', () => {
  assert.deepEqual(modaGptTaskStatuses, [
    'queued', 'planning', 'running', 'waiting_approval', 'verifying',
    'retrying', 'completed', 'failed', 'dead_letter', 'cancelled'
  ]);
  assert.equal(canTransitionModaGptTask('queued', 'running'), true);
  assert.equal(canTransitionModaGptTask('running', 'waiting_approval'), true);
  assert.equal(canTransitionModaGptTask('verifying', 'completed'), true);
  assert.equal(canTransitionModaGptTask('dead_letter', 'retrying'), true);
  assert.equal(canTransitionModaGptTask('completed', 'running'), false);
  assert.equal(canTransitionModaGptTask('cancelled', 'queued'), false);
});

test('Prisma store persists task context and uses compare-and-set lifecycle writes', async () => {
  let createdData: Record<string, unknown> | null = null;
  const updates: Array<Record<string, unknown>> = [];
  const store = new PrismaModaGptTaskStore({
    modaGptTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdData = data;
        return { id: 'task-prisma-1', status: 'queued' };
      },
      updateMany: async (input: Record<string, unknown>) => {
        updates.push(input);
        return { count: 1 };
      }
    }
  } as never);
  const enqueued = await store.enqueue({
    taskType: 'ai.workflow.run',
    payload: JSON.stringify({ workflow: 'product_publish' }),
    merchantId: 'merchant-1',
    tenantId: 'merchant-1',
    actorId: 'actor-1',
    traceId: 'trace-prisma-1',
    parentTaskId: null,
    goal: 'Publish an approved product',
    priority: 5,
    agentId: 'product-creative-manager',
    context: JSON.stringify({ productId: 'product-1' }),
    plan: JSON.stringify({ version: 1 }),
    idempotencyKey: 'tenant:scoped-hash',
    maxAttempts: 3
  });
  assert.equal(enqueued.status, 'queued');
  assert.equal(createdData?.tenantId, 'merchant-1');
  assert.equal(createdData?.traceId, 'trace-prisma-1');
  assert.equal(createdData?.priority, 5);
  assert.equal(createdData?.context, JSON.stringify({ productId: 'product-1' }));

  assert.equal(await store.persistPlan('task-prisma-1', 'worker-1', '{"plan_id":"plan-1"}'), true);
  assert.deepEqual(updates[0], {
    where: {
      id: 'task-prisma-1',
      status: { in: ['planning', 'running', 'verifying'] },
      lockedBy: 'worker-1'
    },
    data: { plan: '{"plan_id":"plan-1"}' }
  });

  assert.equal(await store.complete('task-prisma-1', 'worker-1', '{"approvalRequired":true}', 'waiting_approval'), true);
  assert.deepEqual(updates[1], {
    where: { id: 'task-prisma-1', status: { in: ['running', 'verifying'] }, lockedBy: 'worker-1' },
    data: {
      status: 'waiting_approval',
      result: '{"approvalRequired":true}',
      error: null,
      lockedBy: null,
      lockedUntil: null,
      lastErrorCode: null,
      completedAt: null
    }
  });
  assert.equal(await store.transition({
    id: 'task-prisma-1',
    expectedStatus: 'waiting_approval',
    status: 'cancelled'
  }), true);
  assert.deepEqual(updates[2].where, { id: 'task-prisma-1', status: 'waiting_approval' });
});

test('Prisma store deduplicates matching legacy tasks during tenant-key migration', async () => {
  const lookupKeys: string[] = [];
  const store = new PrismaModaGptTaskStore({
    modaGptTask: {
      create: async () => { throw { code: 'P2002' }; },
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) => {
        lookupKeys.push(where.idempotencyKey);
        if (where.idempotencyKey !== 'merchant-task:merchant-1:client-key') return null;
        return {
          id: 'legacy-task-1',
          status: 'queued',
          taskType: 'ai.workflow.run',
          merchantId: 'merchant-1',
          tenantId: 'merchant-1',
          actorId: null,
          traceId: 'legacy-task-1',
          parentTaskId: null,
          goal: 'ai.workflow.run',
          priority: 0,
          agentId: null,
          payload: '{"workflow":"merchant_task"}',
          context: '{"workflow":"merchant_task"}',
          plan: null
        };
      }
    }
  } as never);
  const result = await store.enqueue({
    taskType: 'ai.workflow.run',
    payload: '{"workflow":"merchant_task"}',
    merchantId: 'merchant-1',
    tenantId: 'merchant-1',
    actorId: 'actor-1',
    traceId: 'new-trace',
    parentTaskId: null,
    goal: 'Run merchant task',
    priority: 0,
    agentId: 'product-creative-manager',
    context: '{}',
    plan: null,
    idempotencyKey: 'tenant:new-scoped-hash',
    legacyIdempotencyKey: 'merchant-task:merchant-1:client-key',
    maxAttempts: 3
  });

  assert.equal(result.id, 'legacy-task-1');
  assert.equal(result.deduplicated, true);
  assert.deepEqual(lookupKeys, ['tenant:new-scoped-hash', 'merchant-task:merchant-1:client-key']);
});

test('business events become tenant-scoped idempotent queue tasks and reject personal fields', async () => {
  const store = new MemoryTaskStore();
  const queue = new ModaGptTaskQueue(store);
  const event = {
    type: 'inventory.low' as const,
    eventId: 'stock:style-42',
    merchantId: 'merchant_1',
    occurredAt: '2026-10-01T00:00:00.000Z',
    data: { sku: 'SKU-42', availableUnits: 3 }
  };
  const first = await publishModaGptEvent(queue, event);
  const replay = await publishModaGptEvent(queue, event);
  assert.equal(first.deduplicated, false);
  assert.equal(replay.deduplicated, true);
  assert.equal(replay.id, first.id);
  const otherTenantEvent = await publishModaGptEvent(queue, {
    ...event,
    merchantId: 'merchant_2'
  });
  assert.notEqual(otherTenantEvent.id, first.id);
  const outboxFirst = createModaGptEventTaskInput(event);
  const outboxReplay = createModaGptEventTaskInput(event);
  assert.deepEqual(outboxFirst, outboxReplay);
  assert.equal(outboxFirst.taskType, 'ai.event');
  assert.equal(outboxFirst.merchantId, event.merchantId);
    assert.equal(outboxFirst.tenantId, event.merchantId);
    assert.equal(outboxFirst.actorId, 'system:outbox');
    assert.equal(outboxFirst.traceId, outboxFirst.idempotencyKey);
    assert.equal(outboxFirst.goal, 'Process inventory.low event stock:style-42');
    await assert.rejects(
    publishModaGptEvent(queue, { ...event, data: { buyerEmail: 'buyer@example.test' } }),
    /MODAGPT_EVENT_PAYLOAD_INVALID/
  );
});

test('transactional outbox creates tenant-scoped queue rows and surfaces failures to abort the business transaction', async () => {
  const outboxEvent = {
    type: 'inventory.low' as const,
    eventId: 'stock:outbox-1',
    merchantId: 'merchant_1',
    occurredAt: '2026-10-01T00:00:00.000Z',
    data: { sku: 'SKU-42', availableUnits: 3 }
  };
  let savedRows: unknown[] = [];
  const tx = {
    modaGptTask: {
      createMany: async ({ data }: { data: unknown[] }) => {
        savedRows = data;
        return { count: data.length };
      }
    }
  };
  await enqueueModaGptEventsInTransaction(tx as never, [outboxEvent]);
  assert.equal(savedRows.length, 1);
  assert.deepEqual(savedRows[0], {
    taskType: 'ai.event',
    merchantId: outboxEvent.merchantId,
      tenantId: outboxEvent.merchantId,
      actorId: 'system:outbox',
      traceId: createModaGptEventTaskInput(outboxEvent).traceId,
      parentTaskId: null,
      goal: 'Process inventory.low event stock:outbox-1',
      priority: 0,
      agentId: null,
      context: JSON.stringify(createModaGptEventTaskInput(outboxEvent).context),
      plan: null,
    idempotencyKey: createModaGptEventTaskInput(outboxEvent).idempotencyKey,
    payload: JSON.stringify(createModaGptEventTaskInput(outboxEvent).payload),
    maxAttempts: 5
  });

  const failingTx = {
    modaGptTask: {
      createMany: async () => { throw new Error('OUTBOX_INSERT_FAILED'); }
    }
  };
  await assert.rejects(
    enqueueModaGptEventsInTransaction(failingTx as never, [outboxEvent]),
    /OUTBOX_INSERT_FAILED/
  );
});

test('worker stops promptly while waiting for its next poll', async () => {
  const worker = startModaGptTaskWorker(
    new ModaGptTaskQueue(new MemoryTaskStore()),
    'worker-test',
    {},
    { pollIntervalMs: 10_000 }
  );
  await worker.stop();
});
