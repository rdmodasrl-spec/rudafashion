# ModaGPT task queue foundation

ModaGPT background work is stored in PostgreSQL in the existing `ModaGptTask`
table. Apply the normal Prisma migrations before deploying code that reads this
table:

```sh
npm run db:migrate
```

`ModaGptTaskRuntime` is the single task submission/worker contract; the old
`ModaGptTaskQueue` export remains a compatibility alias. It persists tenant,
actor, trace, parent task, goal, priority, agent, bounded context/plan, result,
error and retry metadata. Merchant tasks derive tenant identity from the
authenticated merchant context; a conflicting merchant/tenant pair is rejected.
Idempotency keys are hashed with the tenant scope before storage, so a matching
key in another tenant cannot collide or expose a task.
During rollout, a conflict on the new scoped key also checks the legacy raw key
and reuses it only when tenant, merchant, task type, and payload match.

The canonical persisted states are `queued`, `planning`, `running`,
`waiting_approval`, `verifying`, `retrying`, `completed`, `failed`,
`dead_letter`, and `cancelled`. The low-inventory review now persists its
planning, execution, and verification phases through lease-guarded transitions;
a failed verification that triggers a replan returns to `planning`. Other task
handlers may remain in `running` unless they report their execution phase.
The low-inventory execution plan is stored in the existing task `plan` field
under the active lease, including task/trace/tenant identity, dependencies,
agent/tool assignment, expected results, risk, phase, and timestamps. A
replanned plan version replaces the previous snapshot; it is not a resumable
per-step checkpoint.
Approval-required results release their lease and pause in `waiting_approval`.
Approved continuation tasks link to their parent and complete it on success;
rejected approvals cancel the waiting parent.

The queue uses `FOR UPDATE SKIP LOCKED` claims so multiple worker processes can
share the same table. Claims have a lease; an expired lease can be recovered.
Handlers are at-least-once and must therefore be safe to retry. Failures store a
bounded error code, increment retry count, retry with capped exponential delay,
and move to `dead_letter` after the configured attempt limit. Reusing a key for
different task data within one tenant is rejected.

The additive task-runtime migration backfills legacy status names and task
identity/context fields. It has been applied and validated on the isolated
local `ruda_modagpt_test` database only; no application database was changed.
Platform admins with `settings.ai_support` can inspect recent status and retry
dead-letter tasks:

- `GET /api/admin/modagpt/tasks`
- `POST /api/admin/modagpt/tasks/:id/retry`

Payloads and results are size-limited JSON. The task list deliberately excludes
both to avoid exposing business data in an operational overview.

`publishModaGptEvent` validates and queues versioned event envelopes and rejects
common personal-data fields. Selected RUDA writes also enqueue events in the
same Prisma transaction as the business change: product create/update, inventory
movement (including a low-stock threshold event), order create/complete, quote
create/accept, payment completion, creative generation, and product-content
draft approval/rejection.

The worker persists accepted events to the tenant-scoped Brain when
`MODAGPT_BRAIN_ENABLED=true`. Only `inventory.low` starts a business workflow:
it queues the read-only low-inventory review, which re-reads current stock and
sales. `product.created` also records the narrow merchant-to-product graph fact.
Other accepted events are recorded as events only; they do not yet run general
AI workflows, contact customers, or perform business writes. Brain-disabled
event tasks fail and follow the queue retry/dead-letter behavior.

The task contract has unit coverage for approval pause/resume, tenant-scoped
idempotency, execution-phase transitions, and simulated lease recovery. The
PostgreSQL integration test verifies tenant idempotency, worker-bound phase CAS,
expired-lease reclamation, stale-worker rejection, and persisted completion on
the isolated local test database. Transaction rollback and recovery after an
actual process restart remain unverified. Event hooks and consumers remain
partial; event types being accepted by the envelope validator does not mean
that a corresponding RUDA source hook or workflow consumer exists.

The ModaGPT PostgreSQL integration suite also contains a merchant Product
lifecycle test that executes the shared task executor and Tool Runtime across
approval, publication, read-back verification, unpublication, and tenant-scoped
lookup. It still requires a safely configured isolated test database and seeded
merchant/category data before it can provide database-level evidence.
