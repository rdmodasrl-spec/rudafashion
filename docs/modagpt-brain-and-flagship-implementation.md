# ModaGPT Brain and Flagship Implementation Contract

**Status:** Incremental implementation contract; this document describes the
target and records delivered versus pending work. A checked box means code and
validation exist; it does not imply a production migration or provider has
been deployed.
**Reviewed:** 2026-10-01

## Product decision

Upgrade the current RUDA platform in three ordered workstreams. Preserve RUDA
business records, merchant isolation, AI employees, provider controls, and
human review; do not replace them with parallel systems.

```text
Command 1 — ModaGPT Brain data and learning services
    ↓
Command 2 — ModaGPT Core, agents, tools, workflows and operations
    ↓
Command 3 — focused front-end operations and user experience
```

The first two commands are backend-first. Existing screens may be extended
only when needed to operate a completed backend capability; a broad UI redesign
waits for stable service contracts.

## Existing-code audit

| Area | Existing | Decision |
|---|---|---|
| Merchant-scoped employee memory | `MerchantAiEmployeeMemory`, strict merchant-keyed APIs and explicit categories | **KEEP + EXTEND** with tenant, scope, lifecycle, provenance, confidence, temporal and access metadata. Backfill the tenant key from its merchant; never copy old memories into a parallel table. |
| Merchant assistant memory/history | `MerchantAssistantMemory`, conversation/message history, actor scoping | **KEEP** for its current assistant UX. Adapt into Brain retrieval only through a tenant-scoped service; do not bulk-migrate or treat raw chat history as knowledge. |
| Merchant support memory and RAG | `MerchantSupportMemory`, redaction, local Ollama embeddings and curated support retrieval | **KEEP**. Reuse the retrieval/provider boundary where its source and access contract applies; do not silently broaden support-only knowledge to merchant business tools. |
| Knowledge | Curated public support knowledge and local support-document RAG exist; general tenant knowledge ingestion/indexing is missing | **EXTEND** with versioned, permissioned Brain documents/chunks. Ingestion parsers and a production vector backend remain separately gated work. |
| AI employees / team runtime / RUDA tools | `AiEmployeeDefinition`, merchant installations, permission checks and typed product/inventory/sales workflows | **KEEP + ADAPT** to a Core context-builder and service interfaces. Registry status is not authorization; each existing tool remains authoritative. |
| Verification | `aiEmployeeVerifier` validates language, shape, and factual number grounding in selected workflows | **KEEP + EXTEND** with task-level verification artifacts, not an LLM-only verifier. |
| Providers / resilience | Server-side DeepSeek, OpenAI planning, Gemini vision, Fal creative, local fallbacks, circuit breaker | **KEEP**. Brain records provider/version/latency/cost independently; routing changes require measured quality, policy, availability and spend. |
| Metrics / feedback | Process-local inference metrics and assistant thumbs-up/down | **KEEP + EXTEND** with persistent task evaluation and structured business feedback/outcomes. Existing ratings are evidence, not automatic training data. |
| AI task queue | PostgreSQL `ModaGptTask`, lease-based `SKIP LOCKED` claims, retry/dead-letter status and admin inspection | **KEEP**. Event envelopes and worker primitives exist; production domain writes still need transactional outbox/event publishing and registered, policy-checked handlers. |
| Knowledge graph / generic experiences / lessons / learning runs | No unified durable Brain service was present in the reviewed schema | **MISSING → ADD** incrementally with source, tenant, verification, expiry, version, contradiction and review state. |
| Voice, video editing/generation, generic sandbox, dynamic cost router, AI-specific DR | Not implemented as general ModaGPT capabilities | **MISSING → PHASE** individually. Do not advertise provider access or placeholder routes as delivered features. |

### Non-negotiable invariants

1. Database access is behind typed Brain services. Agent/model output is
   untrusted input and never grants a tenant, permission, tool, or write action.
2. Every merchant Brain query includes the server-authenticated tenant and
   merchant keys before relevance ranking. Platform/global scope is opt-in,
   permission-gated and never included by a merchant-supplied tenant value.
3. Model-generated claims remain candidates. Only verified source evidence,
   deterministic business outcomes or authorized human review may promote
   durable knowledge. Conflicts are retained and surfaced; old facts are not
   silently overwritten.
4. High-risk lessons (finance, legal, pricing policy, merchant policy and
   publishing rules) require human review. One task outcome cannot establish a
   reusable lesson.
5. Historical conversation data is not bulk-copied. New indexes are built only
   for explicitly approved sources, with redaction, source references,
   retention and deletion behavior.
6. No Agent may perform a write by direct SQL. Existing RUDA permission,
   entitlement, approval, audit, inventory, order and idempotency paths remain
   authoritative.

## Command 1 — Brain database and learning services

```text
RUDA business facts + permissioned knowledge + scoped memory
+ verified experiences + feedback/evaluation + evidence-backed graph/lessons
= ModaGPT-owned, provider-independent intelligence
```

### Data contract

- **Memory:** extend `MerchantAiEmployeeMemory` in place. Support
  `SHORT_TERM`, `SESSION`, `TASK`, `MERCHANT`, `BRAND`, `PRODUCT`, `CUSTOMER`,
  `AGENT`, `ORGANIZATION`, and `PLATFORM` scope vocabulary; current employee
  endpoints continue to create merchant-scoped preferences and operating rules.
  Store lifecycle, confidence, source, verification, version, expiry, validity,
  access and tenant metadata.
- **Knowledge:** versioned documents and chunks retain source type/reference,
  optional URL, MIME type, authorization metadata, tenant/merchant, source
  trust, verification, validity and expiry. Supported ingestion formats are a
  roadmap contract, not permission to accept arbitrary uploads without
  signature checks, size bounds, parsing isolation and review.
- **Graph/facts:** typed entities and source-backed predicate facts use
  tenant-scoped entity linking. Conflicting current facts are both preserved
  with a contradiction group pending resolution.
- **Experience/evaluation/feedback:** keep task goal, actions/tools, model and
  workflow versions, verifier result, business outcome, latency/cost and
  structured feedback. Avoid raw prompt or personal-data logging by default.
- **Lessons:** store evidence links, success rate, confidence, sample size,
  contradiction count, temporal validity, version, risk and reviewer. Promotion
  is governed by deterministic thresholds plus human review where required.
- **Events/retrieval/learning runs:** deduplicated, tenant-scoped records support
  event provenance and an auditable learning/retrieval trail without retaining
  raw retrieval questions (store hashes, not query text).
- **Vector abstraction:** provider-neutral embedding/search interfaces support
  semantic and keyword/hybrid retrieval. A text-column placeholder is not
  presented as a production vector index; choose/benchmark a vector backend
  only after RUDA's privacy, operations and query needs are measured.

### Brain service boundary

```text
authenticated request / authorized task
    → Brain services (trusted tenant context + permissions)
    → deterministic isolation, scope and policy filters
    → PostgreSQL / approved embedding adapter
    → ranked, provenance-carrying context
```

Required service responsibilities: memory, knowledge, experience, lesson,
evaluation, retrieval, graph, learning and event operations. A service receives
tenant identity from authenticated RUDA code, never from an LLM response.

### Learning state machine

```text
agent result → verifier artifact → evaluation → experience candidate
→ outcome/feedback evidence → lesson candidate → deterministic promotion gate
→ human approval when risk/sample/conflict requires it → verified lesson
```

Rejected, unverified, stale, expired or conflicted material is excluded from
authoritative answer context. A user correction does not delete the original
evidence; it creates a versioned candidate and contradiction/review record.

### Command 1 acceptance

- Automated tests cover scoped memory/document/experience/lesson retrieval,
  tenant isolation, permissions, expiry/recency/confidence ranking, feedback,
  evaluation, evidence thresholds, high-risk human approval, contradiction and
  immutable version history.
- A task cannot retrieve another merchant's memory, knowledge, experience,
  lesson, graph fact, event or evaluation, even if its query matches exactly.
- Candidate model output is not retrievable as verified business fact or
  automatically promoted.
- Existing AI Employee, Assistant, Support RAG and provider workflows pass
  regression tests with the feature disabled and enabled.
- Migration has a backup/rollback/recovery note and is verified against the
  supported PostgreSQL version before deployment.

## Command 2 — all ModaGPT capabilities and Core integration

```text
ModaGPT Core
├─ Master Supervisor and bounded Orchestrator
├─ Planner → policy-checked Executor → independent Verifier/Reviewer
├─ typed, permission-limited Fashion/Design/Product/Inventory/Sales/Business/
│  Marketing/Creative/Research Agent capabilities
├─ RUDA tool adapters: products, inventory, orders, customers, finance, quotes,
│  suppliers and stores (only where an authorized RUDA API already exists)
├─ Creative: existing image/Try-On first; editing/video/campaign later
├─ Voice: transcription/speech/voice agent only after consent, provider,
│  retention, quota and human-handoff contracts are defined
├─ Brain retrieval, workflow/automation, approvals, tasks and proactive insight
├─ server-side model routing, evaluation, cost/quality/latency telemetry
└─ policy, permission, quota, queue, retries, alerts, security and recovery
```

Implementation rules:

- Supervisor chooses only from registered, available and explicitly authorized
  agent/tool capabilities. A model cannot invent a tool or elevate a permission.
- Planner outputs a bounded typed plan. Executor re-checks current tenant,
  permission, entitlement and business invariants immediately before each tool
  call. Writes require the existing confirmation/approval and idempotency path.
- Verifier checks result schema, source grounding, business invariants and task
  outcome; it can reject and request a bounded re-plan, not loop indefinitely.
- Agent-to-agent hand-offs use typed task/result envelopes with tenant, trace,
  policy version, permitted tools and size limits; no shared mutable prompt
  context or unrestricted credentials.
- Events are opt-in and emitted transactionally with RUDA business commits via
  an outbox. Each consumer is idempotent, tenant-scoped, budgeted and kill
  switchable; PII is not copied into event payloads unless strictly required
  and approved.
- Sandbox work uses isolated, resource-limited, no-network-by-default
  execution. It cannot reach production credentials or commit business writes;
  promotion of artifacts uses a separately authorized review API.
- Evaluation is versioned by model/agent/prompt/tool/workflow/dataset; deterministic
  authorization and business-data oracles are mandatory. Model-graded quality
  is supplementary and sampled for human review.
- Dynamic routing stays disabled until measured task quality, provider
  capability/sensitivity, availability, actual or clearly estimated price,
  merchant plan and hard spend limits can be enforced and audited.
- Queue health, provider bulkheads/circuit breakers, bounded retries, DLQ,
  backup/restore drills and alerts have explicit service objectives and
  operator runbooks. Do not retry paid or non-idempotent work blindly.

### Command 2 acceptance

One existing merchant workflow proves the complete vertical path: authorized
request → Brain retrieval → plan → existing RUDA tool → independent verifier →
feedback/outcome → evaluation/experience. Every failure boundary has a typed
error, audit entry and safe retry/approval behavior. Additional agents,
modalities and event consumers ship one bounded workflow at a time.

## Command 3 — front end, after backend contracts stabilize

Extend the existing Admin AI Control Center, merchant ModaGPT chat/task UI,
employee install/approval surfaces and creative review library. Do not create a
parallel dashboard or new public upload/publish path.

Operator views should show health, queue age/dead letters, eval/regression
scorecards, provider/cost confidence, candidate knowledge/lesson review and
policy decisions with least-privilege access. Merchant surfaces should display
only their own authorized memory/tasks, explain approval and billable steps,
allow feedback/correction, and never expose internal prompts, provider secrets
or other tenants' data.

## Incremental implementation record

| Workstream | State at review | Next gate |
|---|---|---|
| Existing RUDA/AI inventory and reuse audit | **Recorded above** from current schema, server routes and AI service modules | Re-review at each phase; amend rather than fork the registry or memory stores. |
| PostgreSQL task queue foundation | **Implemented in working tree and unit-tested**: lease claims, retries, DLQ, event envelope contract, admin list/retry surface, listed transactional outbox hooks and a read-only low-inventory consumer | Apply additive migrations in a backed-up deployment; add PostgreSQL atomicity/recovery tests, remaining event hooks and operator consumer controls. |
| Brain schema foundation | **Implemented in working tree; Prisma-validated**: extend employee memory in place; add source-backed documents/chunks, facts/entities, experiences, evaluations, feedback, lessons/evidence, events, retrieval logs and learning runs | Apply additive migrations only in a backed-up deployment; run PostgreSQL migration/smoke checks before enabling. No production migration has been run. |
| Brain retrieval / learning | **Partially implemented and unit-tested**: feature-flagged tenant-scoped retrieval; one-hop verified graph retrieval; assistant feedback; verified outcomes/evaluations for selected read-only AI Employee completions and low-inventory reviews; a high-risk lesson candidate after repeated verified runs | Extend capture to remaining workflows; implement approved embedding/vector search, parsers, source invalidation and PostgreSQL-backed end-to-end learning tests. |
| Industry team provisioning | **Implemented in working tree and unit-tested**: eight canonical Industry Packs; additive Merchant industry, four tenant-scoped Core assignments and idempotent provision runs; registration writes merchant/account/team in one transaction; industry-change API audits and updates the four assignments without touching business history; team and low-inventory runtimes read persisted assignment configuration | Apply the migration in a backed-up deployment; add PostgreSQL registration rollback/concurrency tests. Pack skills, knowledge tags and workflows are configuration metadata, not created knowledge, permission grants, or independently executable workflow implementations. |
| Event-driven Brain | **Partially implemented**: transaction-coupled outbox hooks for product create/update, inventory change/low, order create/complete, quote create/accept, Solana payment complete, creative generated and content-draft approval/rejection; only `inventory.low` has an analysis consumer | Add missing event sources, broader durable workflow semantics, tenant enrollment/consent/cooldown/notification, PostgreSQL atomicity tests and operator controls. |
| Supervisor/Core and agent collaboration | **Partially implemented**: the unified merchant task API/worker routes through the shared supervisor and Tool Runtime for product draft/update/publish/unpublish, quote draft/update/submit/send, and six read-only business-analysis tools. Quote send records `SENDING` before provider execution and marks `SENT` only after the Resend adapter returns a non-empty provider message ID; delivery evidence includes provider, recipient, task/trace IDs, result, failure reason and audit. Send approvals bind quote terms/items/validity, explicit currency and recipient; a missing/invalid currency blocks send approval, and stale snapshots are invalidated. Retries use the same Resend idempotency key. A PostgreSQL integration test now exercises Product approval → shared Runtime → publish/read-back → unpublish/read-back and tenant-scoped record lookup, but it has not run. The additive currency and delivery migrations still require a backed-up isolated PostgreSQL test database and migration verification; controlled real Resend delivery is also pending. The configured application database is not a confirmed test database, so no migration/status query was run against it. Product, Quote and Business Analysis are not production-verified; Fashion Creative remains unavailable through this task worker. |
| Voice, video, generic sandbox, dynamic cost router, AI-specific DR | **Not implemented** | Separate work items after concrete workflow, consent/policy, spend and recovery acceptance tests exist. |
| Broad frontend redesign | **Intentionally deferred** | Begin only after the Brain/Core contracts and support runbooks are stable. |

### Delivered Brain slice and explicit boundaries

- Merchant registration provisions exactly four fixed Core assignments from one
  of eight canonical Industry Packs in the same transaction as Merchant and
  AuthAccount creation. Existing `businessType` values map to an Industry for
  compatibility; quick-start and Google registration use the Fashion Company
  default when no explicit Industry can be supplied by those legacy entry
  points. `PATCH /api/merchant/ai-team/industry` is tenant-authenticated,
  employee-permission checked, idempotency-key aware and audited. Industry
  changes update team configuration only; they do not copy/delete orders,
  products, customers, memories, billing plans, or existing permission grants.
- Core assignment `defaultPermissions` are recommended capability metadata,
  **not** runtime grants. Existing AI Employee installations, entitlements,
  employee permissions, tool policies and approvals remain authoritative.
  The existing low-inventory and merchant AI Team runtime paths now read the
  persisted Industry Team configuration, but executable delegation still maps
  to the existing authorized RUDA employee/tool paths.
- The Industry migration is additive and Prisma-generated client/types validate
  locally; it has **not** been applied to PostgreSQL. Registration rollback,
  concurrent idempotent provisioning and production migration behavior still
  need PostgreSQL integration validation.
- The existing employee-memory store is extended in place, and the Brain
  migration creates the additional knowledge, graph, experience, evaluation,
  feedback, lesson, event and retrieval/learning records. Prisma validates the
  schema and migration DDL; the database migration has **not** been applied.
- With `MODAGPT_BRAIN_ENABLED=true`, the existing AI Employee execution path
  can retrieve tenant-filtered Brain context. The same opt-in boundary enables
  assistant feedback persistence and the PostgreSQL event worker. The example
  environment keeps this flag false until the schema is deployed.
- Brain ranking and tenant/permission/lifecycle filters are covered by unit
  tests, including the actual service query boundary. These tests do not
  substitute for PostgreSQL integration, migration, or production smoke tests.
- Knowledge chunks currently support parsed text only. There is no document
  parser suite, production embedding provider, or vector database adapter;
  semantic scoring is only an optional score input to the ranking contract.
- The existing assistant rating is recorded as feedback, and this existing
  read-only AI Employee route now records verifier-passed experiences and
  deterministic completion evaluations without storing the raw merchant
  request or response. Other employee workflows and business outcomes are not
  yet captured; the automatic observe-to-learn loop is therefore not complete.
- Transactional outbox hooks now cover product create/update, inventory
  change/low, order create/complete, quote create/accept, Solana payment
  completion, creative generation, and content-draft approval/rejection. Each
  event is queued inside its source Prisma transaction. The only business
  analysis consumer is the read-only `inventory.low` review.
- The low-inventory consumer re-reads current tenant-scoped stock and recent
  sales, suppresses stale alerts, and records an idempotent experience and
  deterministic evaluation. Six verified successes can create one high-risk
  lesson candidate for human review; no inventory or purchasing write occurs.
- `product.created` builds a narrow source-backed Merchant/Brand→Product graph
  path, and Brain retrieval follows verified one-hop facts. General entity
  resolution, broader RUDA relations, vector search, and source invalidation
  remain unimplemented.
- A deterministic supervisor filters four already-installed, authorized
  read-only capabilities before the existing AI Team planner. This is not
  nine-agent collaboration, a complete planner/executor/replanner, or a
  general tool/policy runtime.
- The low-inventory worker invokes registered `get_inventory` and `get_sales`
  tools through a typed context and policy-checked executor. The sales handoff
  receives bounded structured facts rather than chat history. Tool calls
  require the trusted task tenant, active runtime principal, global and
  agent-specific permission grants, schema validation and a persisted
  `EmployeeAuditLog` lifecycle. HIGH and CRITICAL calls require an unexpired
  approval matching task, tenant and tool. The worker grants only these two
  read permissions and registers no write tools.
- Before planning/execution, this workflow calls tenant-filtered Brain retrieval
  for merchant, agent, brand and product scopes. Only retrieval-approved
  references and bounded evidence snippets enter the Agent Context; they are
  recorded in the verified Experience and cannot override current RUDA data or
  authorize tools.
- A typed low-inventory plan runs with a 45-second budget and at most one
  replan. A deterministic verifier recalculates the result from the captured
  tenant-scoped RUDA inventory/sales facts; a failed check repeats the
  read-only source queries once, then stops. The successful Experience and
  durable queue result contain the plan snapshot, verifier result, attempts,
  replan count, Brain references and tool outcomes. This does not yet provide
  a separate durable plan lifecycle, cancellation API or crash checkpoint
  recovery.
- This is a real sequential read-only workflow using existing RUDA inventory
  and aggregate-sales services. It is not a general tool platform, a
  user-facing Approval Service, or a persisted general plan/replanner/
  cancellation system.
- Unit tests cover queue/outbox helper behavior and the current vertical
  slices, but no PostgreSQL integration test has verified transaction rollback,
  worker recovery, lesson persistence, or the full business-to-learning loop.

## Deployment and rollback

1. Back up PostgreSQL and confirm the restore procedure before applying an
   additive migration. Do not run production migrations from a feature branch
   or without the operator's deployment window.
2. Deploy additive schema, generated Prisma client and compatible server code.
   Existing memory rows are backfilled in place; old APIs keep their merchant
   behavior. Do not bulk-ingest assistant history.
3. Keep Brain retrieval and new event consumers disabled until migration,
   tenant-isolation tests, provider policy and monitoring are verified. Enable
   one merchant-safe workflow at a time, with an immediate kill switch.
4. Roll back by disabling Brain/event flags and restoring the prior server
   build. Additive tables/columns are retained until backups and compatibility
   are checked; destructive schema rollback or Brain-data deletion is a
   separate reviewed operation.
5. Record production migration version, smoke-test results, queue recovery,
   cost/latency baseline and rollback owner in the deployment record. Never
   claim live provider, database or DR verification from local build tests.
