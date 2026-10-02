import type { PrismaClient } from '@prisma/client';
import type {
  ModaGptTask,
  ModaGptTaskStatus,
  ModaGptTaskStore,
  ModaGptTaskType
} from './modagptTaskQueue';

type ClaimedTaskRow = { id: string };

export class PrismaModaGptTaskStore implements ModaGptTaskStore {
  constructor(private readonly prisma: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async enqueue(input: {
    taskType: ModaGptTaskType;
    payload: string;
    merchantId: string | null;
    tenantId: string | null;
    actorId: string | null;
    traceId: string;
    parentTaskId: string | null;
    goal: string;
    priority: number;
    agentId: string | null;
    context: string;
    plan: string | null;
    idempotencyKey: string | null;
    legacyIdempotencyKey?: string | null;
    maxAttempts: number;
  }): Promise<{ id: string; status: ModaGptTaskStatus; deduplicated: boolean }> {
    const data = {
      taskType: input.taskType,
      payload: input.payload,
      merchantId: input.merchantId,
      tenantId: input.tenantId,
      actorId: input.actorId,
      traceId: input.traceId,
      parentTaskId: input.parentTaskId,
      goal: input.goal,
      priority: input.priority,
      agentId: input.agentId,
      context: input.context,
      plan: input.plan,
      idempotencyKey: input.idempotencyKey,
      maxAttempts: input.maxAttempts
    };
    if (input.idempotencyKey) {
      try {
        const task = await this.prisma.modaGptTask.create({
          data,
          select: { id: true, status: true }
        });
        return { ...task, status: task.status as ModaGptTaskStatus, deduplicated: false };
      } catch (error) {
        if (
          !error || typeof error !== 'object'
          || !('code' in error)
          || error.code !== 'P2002'
        ) throw error;
        let existing = await this.prisma.modaGptTask.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: {
            id: true, status: true, taskType: true, merchantId: true, tenantId: true,
            actorId: true, traceId: true, parentTaskId: true, goal: true, priority: true,
            agentId: true, payload: true, context: true, plan: true
          }
        });
        let matchedLegacyKey = false;
        if (!existing && input.legacyIdempotencyKey && input.legacyIdempotencyKey !== input.idempotencyKey) {
          existing = await this.prisma.modaGptTask.findUnique({
            where: { idempotencyKey: input.legacyIdempotencyKey },
            select: {
              id: true, status: true, taskType: true, merchantId: true, tenantId: true,
              actorId: true, traceId: true, parentTaskId: true, goal: true, priority: true,
              agentId: true, payload: true, context: true, plan: true
            }
          });
          matchedLegacyKey = Boolean(existing);
        }
        if (!existing) throw error;
        if (
          existing.taskType !== input.taskType
          || existing.merchantId !== input.merchantId
          || existing.tenantId !== input.tenantId
          || existing.payload !== input.payload
          || (!matchedLegacyKey && (
            existing.actorId !== input.actorId
            || existing.traceId !== input.traceId
            || existing.parentTaskId !== input.parentTaskId
            || existing.goal !== input.goal
            || existing.priority !== input.priority
            || existing.agentId !== input.agentId
            || existing.context !== input.context
            || existing.plan !== input.plan
          ))
        ) throw new Error('MODAGPT_TASK_IDEMPOTENCY_CONFLICT');
        return { ...existing, status: existing.status as ModaGptTaskStatus, deduplicated: true };
      }
    }

    const task = await this.prisma.modaGptTask.create({
      data: { ...data, idempotencyKey: null },
      select: { id: true, status: true }
    });
    return { ...task, status: task.status as ModaGptTaskStatus, deduplicated: false };
  }

  async claim(workerId: string, leaseMs: number): Promise<ModaGptTask<string> | null> {
    return this.prisma.$transaction(async transaction => {
      const now = this.now();
      await transaction.$executeRaw`
        UPDATE "ModaGptTask"
        SET "status" = 'dead_letter',
            "lockedBy" = NULL,
            "lockedUntil" = NULL,
            "lastErrorCode" = 'MODAGPT_TASK_LEASE_EXPIRED',
          "error" = '{"code":"MODAGPT_TASK_LEASE_EXPIRED"}',
            "completedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "status" IN ('planning', 'running', 'verifying')
          AND "lockedUntil" <= ${now}
          AND "attempts" >= "maxAttempts"
      `;
      const rows = await transaction.$queryRaw<ClaimedTaskRow[]>`
        SELECT "id"
        FROM "ModaGptTask"
        WHERE (
          ("status" IN ('queued', 'retrying') AND "availableAt" <= ${now})
          OR ("status" IN ('planning', 'running', 'verifying') AND "lockedUntil" <= ${now} AND "attempts" < "maxAttempts")
        )
        ORDER BY "priority" DESC, "availableAt" ASC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      const candidate = rows[0];
      if (!candidate) return null;
      const claimed = await transaction.modaGptTask.update({
        where: { id: candidate.id },
        data: {
          status: 'running',
          attempts: { increment: 1 },
          lockedBy: workerId,
          lockedUntil: new Date(now.getTime() + leaseMs),
          startedAt: { set: now }
        }
      });
      return {
        id: claimed.id,
        merchantId: claimed.merchantId,
        tenantId: claimed.tenantId,
        actorId: claimed.actorId,
        traceId: claimed.traceId,
        parentTaskId: claimed.parentTaskId,
        goal: claimed.goal,
        taskType: claimed.taskType as ModaGptTaskType,
        status: claimed.status as ModaGptTaskStatus,
        priority: claimed.priority,
        agentId: claimed.agentId,
        payload: claimed.payload,
        context: claimed.context,
        plan: claimed.plan,
        attempts: claimed.attempts,
        retryCount: claimed.retryCount,
        maxAttempts: claimed.maxAttempts,
        idempotencyKey: claimed.idempotencyKey,
        lockedBy: claimed.lockedBy,
        error: claimed.error
      };
    });
  }

  async persistPlan(id: string, workerId: string, plan: string): Promise<boolean> {
    const updated = await this.prisma.modaGptTask.updateMany({
      where: {
        id,
        status: { in: ['planning', 'running', 'verifying'] },
        lockedBy: workerId
      },
      data: { plan }
    });
    return updated.count === 1;
  }

  async complete(
    id: string,
    workerId: string,
    result: string,
    status: 'completed' | 'waiting_approval'
  ): Promise<boolean> {
    const updated = await this.prisma.modaGptTask.updateMany({
      where: { id, status: { in: ['running', 'verifying'] }, lockedBy: workerId },
      data: {
        status,
        result,
        error: null,
        lockedBy: null,
        lockedUntil: null,
        lastErrorCode: null,
        completedAt: status === 'completed' ? this.now() : null
      }
    });
    return updated.count === 1;
  }

  async transition(input: {
    id: string;
    expectedStatus: ModaGptTaskStatus;
    status: ModaGptTaskStatus;
    workerId?: string;
  }): Promise<boolean> {
    const releasesLease = ['waiting_approval', 'completed', 'failed', 'dead_letter', 'cancelled'].includes(input.status);
    const requeues = input.status === 'queued' || input.status === 'retrying';
    const updated = await this.prisma.modaGptTask.updateMany({
      where: {
        id: input.id,
        status: input.expectedStatus,
        ...(input.workerId ? { lockedBy: input.workerId } : {})
      },
      data: {
        status: input.status,
        ...(releasesLease ? { lockedBy: null, lockedUntil: null } : {}),
        ...(requeues ? {
          availableAt: this.now(),
          lockedBy: null,
          lockedUntil: null,
          lastErrorCode: null,
          error: null,
          completedAt: null
        } : {}),
        ...(['completed', 'failed', 'dead_letter', 'cancelled'].includes(input.status)
          ? { completedAt: this.now() }
          : { completedAt: null })
      }
    });
    return updated.count === 1;
  }

  async fail(input: {
    id: string;
    workerId: string;
    errorCode: string;
    retryAt: Date | null;
  }): Promise<boolean> {
    const updated = await this.prisma.modaGptTask.updateMany({
      where: { id: input.id, status: { in: ['planning', 'running', 'verifying'] }, lockedBy: input.workerId },
      data: {
        status: input.retryAt ? 'retrying' : 'dead_letter',
        ...(input.retryAt ? { retryCount: { increment: 1 } } : {}),
        availableAt: input.retryAt ?? this.now(),
        lockedBy: null,
        lockedUntil: null,
        lastErrorCode: input.errorCode,
        error: JSON.stringify({ code: input.errorCode }),
        completedAt: input.retryAt ? null : this.now()
      }
    });
    return updated.count === 1;
  }
}
