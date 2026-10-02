# ModaGPT Development Roadmap

**Status:** Living implementation roadmap  
**Last reviewed:** 2026-10-02

ModaGPT is the fashion-commerce AI workspace above the existing RUDA marketplace and merchant operations system. This document records the agreed direction and a staged, testable delivery order. It is not a claim that planned features are already available.

## Verification snapshot — 2026-10-02

| Area | Code and automated checks | External/integration evidence | Current decision |
|---|---|---|---|
| Product and Quote task workflows | Shared task runtime, approval checks, tenant-scoped tools, audit, and read-back paths have unit coverage. | Three additive approval/quote migrations were applied after a verified pre-deploy backup; all 82 migrations are applied. No eligible isolated PostgreSQL integration database or dedicated Resend test recipient was configured, and no real quote delivery was tested. | Code and production schema deployed; business execution is not integration- or production-verified. |
| Business analysis | Six read-only RUDA tools are exercised through the shared runtime. Analysis excludes cancelled/returned orders, reports recorded refunds separately, and groups invoice totals by status and currency. The latest full unit suite passes (336 tests). | No isolated PostgreSQL integration database was available; unit fixtures do not prove deployed business-analysis behavior. | Unit-verified only; integration/production verification remains open. |
| Billing | The five-plan sheet reads the tenant-scoped catalog; paid assistant chat and image/Try-On use the existing Credits ledger; Free keeps legacy quotas. An additive migration configures PLUS 2,000, PRO 6,000, BUSINESS 12,000, and FASHION_PRO 25,000 monthly Credits, with model/unit pricing stored in the existing feature config. | The new migration was not applied; no Billing PostgreSQL integration URL or Stripe Test Mode account/webhook was configured; no Stripe request or purchase was attempted. Provider costs remain unset and feature switches remain fail-closed until configured. | Partially completed; apply the migration only to the intended environment after backup. Configure per-feature/model costs before opening AI capabilities; purchases remain Test Mode-only until Stripe acceptance, then require separate tax/legal and production authorization. |
| ModaGPT task runtime | Tenant-scoped idempotency, phase CAS, persisted low-inventory execution-plan snapshots, expired-lease reclamation, stale-worker rejection, and completion pass against an isolated local PostgreSQL 16 test database; all 84 repository migrations are applied there. | The application database was not modified. No actual worker-process restart or transactional rollback was exercised. | Local PostgreSQL integration verified for the queue/plan lifecycle slice; per-step resume and production behavior remain unverified. |
| Public SEO | Discovery files return their expected public content types and non-HTML bodies. The primary-domain `/` redirect runs before static-file handling, and static middleware no longer consumes directory URLs before locale/store SSR. Post-deploy smoke validates all 60 locale/page combinations. | Following the authorized deployment, the smoke passed health/readiness, `/` → `/it/`, all 60 localized pages' title/language/OG locale/canonical/hreflang, and public discovery files. PM2 reports `ruda-fashion` online. | Production multilingual SEO routing is verified for the checked public routes; continue monitoring after release. |
| Disaster recovery | Backup and recovery mechanisms and a drill command are documented. | No isolated recovery drill was run in this session. | RPO/RTO remain targets, not measured guarantees. |

The live locale audit initially found all tested locale routes returning Italian
HTML because static serving's automatic `index.html` intercepted `/`, locale
directory routes, and merchant-store root routes before their server-side
redirects/SEO renderers. The root redirect was moved before static handling and
automatic directory-index serving disabled. After authorized production
deployment, the post-deploy smoke passed for the root redirect, all 60 public
locale/page combinations, and discovery files. This verifies the checked
public SEO responses, not every merchant subdomain or search-engine indexing.

## Product direction

```text
RUDA commerce
  products, SKU/inventory, orders, customers, quotes, merchant permissions
                         |
                         v
ModaGPT
  merchant chat | product workflows | creative tools | AI Team | approved automation
                         |
                         v
Provider router
  DeepSeek | OpenAI | Google Gemini | Fal | local Ollama / image service
```

Merchants use one ModaGPT experience and should not need to choose or understand the underlying model. Provider choice is an operational setting, not a second product or a duplicate business-data system.

## Non-duplication and safety rules

1. Before adding a feature, locate the existing page, API, service, permission, quota, storage, audit, and review flow. Extend those interfaces instead of creating parallel ones.
2. Keep provider keys and routing settings in **Platform Admin → 平台 AI → AI 大脑运营中心**. Never put keys in browser code, app configuration, URLs, logs, audit payloads, or merchant-visible API responses.
3. Make all provider calls from the RUDA server through the existing provider layer. Use fixed provider hosts, validate model identifiers and response shapes, bound request/response sizes and timeouts, and report failures explicitly.
4. Respect the existing tenant boundary, merchant consent, staff permissions, subscription/usage limits, content moderation, and audit trail. Do not grant access because an AI model recommends it.
5. AI may draft and recommend; business-changing actions must use the existing authorized RUDA APIs and a clear merchant confirmation step. No automatic product publication, order placement, stock changes, customer contact, or unattended actions without a separately approved feature and controls.
6. Keep generated media private and within existing merchant-scoped storage, review, and retention behavior. Never create a parallel public-media or unreviewed publishing path.
7. Each phase must have automated regression coverage, type checking, and production-build validation before it is marked complete. Real provider health remains “unverified” until tested with an administrator-supplied key.

## Provider credentials and responsibilities

| Provider | Account credential required | Intended ModaGPT responsibility | Current implementation boundary |
|---|---|---|---|
| DeepSeek | DeepSeek API key | Cost-aware primary text reasoning | Server-side text route exists; local fallback is configurable. |
| OpenAI | OpenAI API key | Advanced AI Team planning; future voice/audio capabilities | Advanced text planning exists. Audio, transcription, and speech generation are not yet implemented. |
| Google Gemini | Google AI API key | Image/visual understanding | Server-side visual route exists; local vision fallback is configurable. Image content is sent to Google only when this route is selected. |
| Fal AI | One Fal API key (`FAL_KEY`) | Creative model gateway for supported image, editing, Try-On, and future video models | RUDA currently routes image generation and Try-On through Fal. Video and general editing are not implemented; availability, account access, and per-model cost still require live verification. |
| Local services | Server-local Ollama / image service configuration | Local inference and explicitly configured fallback | Existing local text/vision and image paths remain available; model installation and reachability depend on deployment. |

A Fal key is a provider account credential, not a separate credential for every model. It does **not** guarantee that every model is available to the account, supports the required API, or has the same price, limits, or data policy. Check the specific Fal model's current endpoint, access, pricing, input/output contract, and terms before adding it to the RUDA allowlist. Do not expose a generic client-controlled Fal proxy.

## Existing capabilities to reuse

The following areas exist already and are building blocks, not reasons to add duplicate modules:

- AI provider credentials and model routing are centralized in AI 大脑运营中心; secrets use the existing encrypted server-side integration configuration and public responses expose configuration status, not key material.
- DeepSeek text reasoning, OpenAI advanced text planning, Gemini visual understanding, Fal image generation, and local fallback adapters are present in the server provider layer. API keys have not been supplied here, so real third-party connectivity and account billing have not been verified.
- The merchant ModaGPT workspace contains chat and an initial product-launch flow that drafts listing copy and can generate multiple creative images, with quota checks and merchant confirmation.
- Existing AI Employee roles and RUDA business tools provide permission-checked product, inventory, sales, quote, and product-draft workflows. Existing merchant review remains authoritative.
- Merchant design storage, private media handling, explicit save/review behavior, audit records, and tenant scoping must be reused by new creative capabilities.
- Merchant memory, support RAG, AI feedback, and employee management already have their own surfaces. Connect to those systems only where the data contract and user purpose match; do not make a competing memory store or admin center.

When another feature or deployment changes this inventory, update this section and the implementation record together.

## Delivery order

Work one phase at a time. Within each phase, implement one bounded vertical workflow end-to-end, validate it, and only then move on.

### Phase 0 — Provider control and operational readiness

**State:** Provider settings, circuit status, and bounded process-local inference metrics are exposed in the existing admin center. Live-provider verification and durable cross-process monitoring remain pending.

- Keep all four vendor keys and model settings in AI 大脑运营中心.
- Preserve blank-to-keep and explicit-clear behavior; never return stored secrets.
- Use the existing permission/IP protection, rate limits, audit trail, and connection tests.
- After credentials are provisioned, test each configured route and confirm fallback policy, limits, and supplier account access.

**Acceptance:** Missing keys are shown as unconfigured (not healthy); saved keys are never returned or logged; connection test failures are visible; the configured route and fallback are covered by tests; no secret appears in client assets.

### Phase 1 — Product launch workflow

**State:** Initial merchant workflow implemented through the existing ModaGPT and design-library paths. Server quota primitives have unit coverage; browser-level confirmation, partial-failure recovery, save/review, and no-auto-publish behavior still need workflow integration coverage.

- Draft title and description, then generate the requested creative image set.
- Check subscription and separate chat/image quotas before starting; ask for confirmation before billable generation.
- Preserve completed results when a later image fails and allow retrying only the unfinished work.
- Keep generated work private until the merchant explicitly saves it. Do not create, modify, price, or publish a product automatically.

**Acceptance:** quota boundary, partial failure, retry, confirmation, translation, save/review, and no-auto-publish behavior are tested.

### Phase 2 — Unified creative model routing

**State:** Fal image generation and Try-On already use the existing server-side creative provider path. Keep that path stable; video and general image editing are not implemented, and no additional capability should be added without a concrete merchant workflow.

1. Inventory the existing image-generation, Try-On, upload, storage, quota, and review APIs before adding any route.
2. Extract/reuse one server-side creative routing boundary only where current code has duplicated provider selection; do not wrap unrelated services merely for architectural symmetry.
3. Add one allowlisted Fal capability at a time only when a current merchant workflow needs it; treat editing and video as separately scoped features.
4. Keep endpoint/model IDs server-configured or allowlisted. Validate input files, payload sizes, provider responses and returned media hosts; apply timeouts, cancellation, quotas, rate limits, audit, moderation, and merchant confirmation.
5. Show model-specific cost/availability caveats before billable work. Store results using the existing private media and merchant review path.

**Acceptance:** provider outages fail explicitly or use only the opted-in fallback; no direct browser-to-Fal request; no model can publish content; tests cover tenant ownership, unsafe response URLs, oversize data, quota exhaustion, timeouts, and partial results.

### Phase 3 — OpenAI voice and audio

**State:** Planned; requires an explicit workflow choice before implementation.

- Decide which merchant jobs need speech input, transcription, or generated speech; do not add voice solely because the provider offers an API.
- Reuse existing authentication, conversation, retention, and moderation rules. Do not retain raw recordings by default.
- Apply upload limits, consent, redaction, supported-language/error UX, and model-specific cost limits.

**Acceptance:** recorded content is not used outside its stated purpose; users can recover from unsupported/failed audio; storage and deletion behavior is explicit and tested.

### Phase 4 — Resumable ModaGPT workflow orchestration

**State:** Initial durable execution-phase tracking is integrated into the existing low-inventory review task. Restart replay still reruns the at-least-once task from its beginning; checkpoint/resume and database-level acceptance remain open.

- Model each step, status, idempotency key, usage charge, retry, and generated artifact.
- Persist state only if the workflow must survive a process restart or continue asynchronously; use the existing database/storage conventions and tenant scoping.
- Pause for human approval before any consequential RUDA write. Resume safely without duplicate charges or duplicate business records.

**Acceptance:** restart recovery, duplicate submission, cancellation, retry, partial failure, and approval boundaries pass integration tests.

### Phase 5 — Fashion intelligence and approved business actions

**State:** Planned; build on permission-checked AI Employee tools and RUDA analytics.

- Add evidence-backed product, inventory, and sales recommendations only from authorized RUDA data, with freshness and source context.
- Keep recommendations read-only at first. Add an action only as an explicit, separately permissioned, audited workflow with merchant confirmation.
- Use the existing merchant memory only for bounded preference/context; never treat memory or model output as authoritative records or permissions.

**Acceptance:** tenant isolation, permission denial, stale data, unsupported claims, and approval-before-write cases are covered.

### Phase 6 — Production readiness and measured rollout

**State:** Required before broad launch.

- Set per-provider spend/usage controls, alerting, rate limits, failure and latency metrics, and an incident/disable procedure.
- Confirm supplier account eligibility, model-specific terms, data retention, privacy disclosures, and merchant consent.
- Roll out behind admin-controlled capability availability; monitor quality and negative merchant feedback without automatic self-training.

**Acceptance:** operational owner, rollback/disable path, dashboards, support runbook, privacy review, and deployment verification exist for every enabled capability.

## Flagship target architecture — ModaGPT V2

This is the long-term target, not a description of the current production system. The current RUDA codebase contains useful components (provider adapters, bounded AI Employee tools, tenant-scoped merchant memory, support RAG, and reviewable creative/product drafts), but it does not yet implement a complete multi-agent operating system, durable workflow engine, knowledge graph, general sandbox, automated evaluation platform, or high-availability AI control plane. Build upward from those existing components; do not rebuild their business records or permission surfaces.

```text
ModaGPT experience
        |
Policy / identity / tenant scope / consent / budget
        |
Master Supervisor (request classification and bounded delegation)
        |
Workflow Orchestrator
        +-- Planner --> Executor --> Verifier --> human approval where required
        +-- Contracted agents <--> allowlisted tools
        +-- Durable workflow state, queue, idempotency, retry and cancellation
        |
Context services: existing merchant memory + approved RAG + derived entity links
        |
Model router: policy, capability, plan, quality, cost, latency, availability
        |
DeepSeek | OpenAI | Gemini | Fal | local services | future allowlisted providers
        |
Existing RUDA APIs and records (authoritative business data)
```

The policy layer must be evaluated before planning, before every tool invocation, and before any persisted side effect. A model-produced plan, verifier approval, graph edge, memory, or previous tool result never grants permission. Model output is untrusted input. Provider routing cannot bypass tenant scope, data minimization, merchant consent, subscription entitlements, human approval, or audit requirements.

### Flagship capability tracks

These tracks are intentionally decomposed. Implement the smallest vertical slice that proves its acceptance criteria; do not start by introducing a generic platform framework without a real workflow that needs it.

#### A. Supervisor, planner, executor, verifier, and agent collaboration

**State:** The deterministic verifier remains in use on the existing product, inventory, replenishment, and sales-summary paths. A deterministic supervisor filters those four installed, permissioned capabilities before the existing AI Team planner. The low-inventory worker now has one real, read-only Inventory Agent → Sales Agent handoff through a tenant/policy-checked Tool Runtime. The general Core and Planner/Executor/Verifier/Replanner loop remain incomplete.

- Extend the existing AI Team planner and current allowlisted workers rather than creating a second employee registry or task UI.
- Add a supervisor that classifies intent, risk, required permissions, data scope, and whether the request can be answered, delegated, or must be declined/handed to a person.
- Use explicit typed task/result contracts for agent-to-agent handoffs. Pass only the minimum approved context and references; large files remain in existing private media storage and are passed by tenant-scoped IDs, not copied into prompts by default.
- Start with a single bounded chain: Planner → authorized Executor → independent Verifier. Define finite step, time, token, cost, and retry budgets. Verify against authoritative RUDA results and workflow invariants, not a second model's unsupported confidence.
- A verifier may reject or request one bounded retry; it cannot authorize a business write. Any consequential change still uses the existing RUDA permission checks and a human approval step.
- Add parallel/multi-agent fan-out only when measured latency or quality requires it and after defining deterministic merge/conflict behavior.

**Acceptance:** unauthorized worker/tool selection is rejected server-side; agent handoffs cannot cross merchants or expand data scope; malformed or contradictory results stop safely; retry loops are bounded and idempotent; write operations remain approval-gated.

**Delivered vertical slice:** the existing task planner still produces a typed allowlisted plan, the existing tenant-scoped RUDA query remains the executor, and a shared deterministic verifier now checks the generated answer's structure, language, length, control characters, and numeric grounding against the executor facts. A failed verification returns an explicit workflow error; it does not retry or perform a business write.

The supervisor does not select uninstalled or unauthorized capabilities and
does not access the database directly. The low-inventory event workflow runs an
Inventory Procurement Manager agent first, invokes the registered `get_inventory`
tool, and conditionally hands compact context to the Sales & Customer Manager
agent for the registered aggregate-only `get_sales` tool. Each call checks the
trusted tenant, global and agent-granted permission, input/output validators,
risk/approval gate and timeout, then persists lifecycle audit records in
`EmployeeAuditLog`. This specific workflow is sequential and read-only.

The low-inventory workflow also now executes a typed four-step plan with a
45-second overall budget, one bounded replan, cancellation propagation at the
orchestrator boundary and deterministic source-data verification. Replans
repeat the tenant-scoped RUDA reads; the verified plan snapshot, replan count,
Brain references and tool outcomes are persisted into the idempotent Brain
Experience and durable task result after success. A separate durable plan
state machine, cancellation API, worker recovery checkpointing, generic
planner/replanner, product/quote/creative flows, parallel workflow graphs, all
requested production tools and a unified approval service remain unimplemented.

Before execution the worker now calls the existing tenant-filtered
`retrieveBrainContext` for merchant/agent/brand/product scopes. Returned
verified source references and bounded evidence summaries enter the Agent
Context and are recorded with the plan and Experience. Brain content is treated
as evidence, not authorization or current stock; the workflow's current RUDA
inventory query remains authoritative.

#### B. Long-term memory, retrieval, and knowledge graph

**State:** Existing merchant memory and RAG remain the bounded runtime foundations. Tenant-filtered Brain retrieval now follows verified one-hop graph facts. A product-created worker creates/reuses source-backed Merchant/Brand→Product entities and relations. General entity resolution, wider RUDA relations, embeddings and source invalidation remain unimplemented.

- Keep RUDA relational records as the source of truth for products, customers, suppliers, orders, inventory, and designs. Do not copy a shadow commercial database into a graph.
- Evolve the existing merchant memory and approved RAG contracts only for demonstrated retrieval gaps. Memory remains tenant-scoped, purpose-limited, editable/deletable, and untrusted; no automatic inference or silent memory writes.
- If entity relationship questions cannot be answered reliably from authorized RUDA queries, introduce a derived, rebuildable graph/index with typed entity IDs, source record/version, tenant ID, provenance, and freshness. Never use graph contents as authorization or as fresher truth than the source row.
- Define separate retention and deletion handling so a merchant deletion or source-record change also invalidates derived embeddings/edges. Do not ingest customer personal data into model memory by default.

The current graph slice is deliberately narrow and rebuildable. RUDA
relational records remain authoritative; graph data is not used for permission
decisions or as a replacement for current business queries.

**Acceptance:** every retrieved fact has provenance and freshness; tenant filters apply before retrieval; stale/missing derived data returns an explicit limitation; source updates/deletions invalidate derived content; memory can be inspected, edited, and removed.

#### C. Event-driven AI and durable workflows

**State:** The durable PostgreSQL task queue and transactional outbox foundation now publish events from product create/update, inventory change/low, order create/complete, quote create/accept, Solana payment completion, creative generation, and content-draft approval/rejection writes. `inventory.low` is the only event with an analysis consumer; its current-stock/recent-sales recommendation is read-only.

- Begin with opt-in, low-risk internal notifications or draft creation for one justified RUDA event. Do not trigger paid model calls or customer communications merely because an event exists.
- Reuse the existing event/outbox/queue infrastructure if present; inspect it before adding another queue. Require durable state, event schema versioning, tenant-scoped idempotency, deduplication, retry/backoff, dead-letter inspection, cancellation, and per-merchant/provider budgets.
- Add explicit merchant/admin enrollment, event-specific consent, quiet hours, disable controls, and audit correlation from source event through AI result.
- Store draft/proposed outcomes in existing review surfaces. Never automatically contact a buyer, change inventory, create an order, or publish a product as a background side effect.

**Acceptance:** duplicate events produce one logical workflow and no duplicate charge/write; retries are bounded and observable; cancellation/disable is honored; events cannot disclose another tenant's data; failures are visible and recoverable.

Outbox queue insertion shares the source Prisma transaction, but PostgreSQL
commit/rollback and recovery have not yet been integration-tested. The worker
records idempotent experience/evaluation rows; six verified successful runs
can create one high-risk lesson candidate for human review. This is not a
general workflow engine or proactive notification system. Customer lifecycle,
quote rejection, campaign, other payment-provider and general approval event
hooks remain missing.

#### D. AI sandbox and controlled execution

**State:** Planned; no general arbitrary-code sandbox is implied by this roadmap.

- First implement a data-level preview/dry-run boundary using typed, allowlisted RUDA operations and isolated temporary artifacts, not arbitrary shell, SQL, browser, or network access.
- Generated plans run against a snapshot or read-only context. Validate output files, formats, sizes, content policy, and resource budgets before storing them privately.
- Separate proposed changes from commit. The final write goes through the existing business API, repeats authorization and freshness checks, and requires the appropriate user confirmation.
- If future workflows require executing generated code, that is a separate security project requiring a disposable isolation boundary, deny-by-default egress, strict CPU/memory/time quotas, secret isolation, filesystem limits, and independent security review before use.

**Acceptance:** sandbox output cannot mutate production records before approved commit; no ambient credentials or unrestricted network access are available; validation failures leave no partial business writes or public artifacts.

#### E. Model, agent, tool, and prompt evaluation

**State:** Unit and workflow regression tests exist; a governed evaluation and quality/cost scorecard is planned.

- Build a versioned, access-controlled evaluation dataset from synthetic or explicitly approved/redacted examples. Do not copy raw merchant conversations or personal data into an evaluation corpus by default.
- Evaluate provider/model and prompt changes against task correctness, policy/permission compliance, schema validity, refusal behavior, tenant isolation, latency, token/image usage, and cost.
- Add deterministic test oracles for business facts and authorization; use model-graded judgments only as a supplementary signal with sampled human review.
- Record model, prompt, tool, policy, and dataset versions with each result. Require regression thresholds and a rollback path before promoting a route.
- Route negative feedback to a human review queue; ratings must not directly fine-tune, rewrite prompts, or alter policies automatically.

**Acceptance:** every release candidate runs its relevant golden/regression set; scorecards expose failure cases and confidence limits; private test data has documented consent, retention, and deletion; a model change cannot silently replace the approved production route.

#### F. Policy and guardrail engine

**State:** Existing merchant/platform permission checks and workflow-specific validation are authoritative; a shared policy decision layer is planned.

- Centralize reusable decisions only after mapping the existing role permissions, tenant guards, consent, plan entitlements, quotas, admin approvals, audit events, and business invariants. Do not replace or weaken them with an AI-only permission table.
- Represent principal, merchant/tenant, agent, tool, data classification, purpose, requested action, risk, entitlement, approval requirement, and policy version in a typed decision context.
- Enforce decisions at the server tool/API boundary; deny by default for missing, stale, or conflicting policy data. Log the decision and reason without recording secrets or unnecessary personal data.
- Treat injection defenses as defense in depth; the primary security control is capability-limited tools and server-side authorization, not prompt wording.

**Acceptance:** policy decisions are deterministic and unit-tested for allow/deny/escalate cases; every tool independently enforces scope; policy outages fail closed for writes; audit records support investigation without leaking protected content.

#### G. Cost- and quality-aware model routing

**State:** Provider selection and explicit fallback exist; dynamic optimization and budget intelligence are planned.

- First define an administrator-controlled route policy by task type, data sensitivity, required modality, allowed providers, merchant plan, and maximum spend. Keep a deterministic safe default.
- Add provider health, latency, quality evaluation, and actual usage/cost telemetry before claiming the router can optimize on those dimensions. Show when prices are estimates or unavailable.
- Route only among allowlisted providers/models with matching capability and policy. Do not send sensitive inputs to a new provider as a hidden fallback.
- Enforce per-request, per-merchant, and platform budgets before billable calls; expose usage and failure reasons to authorized operators. Provider retries/fallback must not create uncontrolled duplicate charges.

**Acceptance:** routing decisions are reproducible and auditable; budgets are enforced under concurrency; unavailable price/health data degrades to the configured safe route; sensitive data never crosses the configured provider boundary without consent.

#### H. Reliability, high availability, and disaster recovery

**State:** A process-local circuit breaker now protects the configured DeepSeek, OpenAI, Gemini, and Fal provider routes from repeated failures. Durable cross-process queues, alerts, and AI workflow disaster recovery remain planned.

- Define service objectives and recovery goals for provider routing, queue processing, and persisted workflows separately from the RUDA database objectives.
- Add timeouts, bounded exponential retry, circuit breakers, concurrency limits, and provider-specific bulkheads at the existing server-side adapter boundary. Do not retry non-idempotent paid or business operations without idempotency controls.
- The current circuit breaker opens after three consecutive retryable failures, rejects provider calls while open, permits one half-open probe after a 30-second cooldown, and resets on success or provider-settings change. Non-retryable provider HTTP 4xx responses (except 408 and 429) do not trip the breaker, so credential/configuration errors remain visible rather than masquerading as provider outages. Existing explicit local/primary-provider fallback remains the only automatic recovery path; the breaker itself never retries or duplicates a paid call. DeepSeek falls back to the configured local text default, Gemini to the local vision default (`llava:latest`), and advanced OpenAI planning to the configured primary reasoning route; a cloud model ID is never reused as a local model ID.
- Persist workflow checkpoints and safely resume only after durable orchestration is justified. Keep provider outage behavior explicit; local failover is allowed only when configured and compatible with data policy.
- Monitor queue age, stuck/dead-letter jobs, provider latency/error rates, spend, and workflow recovery. Alert operators without including prompts, secrets, or customer content in notifications.
- Test recovery by replaying synthetic jobs in an isolated environment; keep AI workflow recovery distinct from PostgreSQL/media backup and restore procedures.

**Acceptance:** provider outage does not cause unbounded retries or duplicate writes/charges; breaker open/close behavior is tested; queued work can be inspected, retried, cancelled, and recovered; restore/replay drills record measured results and do not touch production business data.

## Recommended implementation sequence for flagship work

1. Finish and live-verify the current four-provider control center without expanding scope into unimplemented media modalities.
2. Establish a small, privacy-safe evaluation set and baseline current AI Team/product-launch behavior before changing orchestration.
3. Harden one existing workflow with typed Planner → Executor → Verifier steps, policy decisions, explicit approval, idempotency, and observability.
4. Add durable queue/checkpoint behavior only for that workflow if restart-resilience or asynchronous execution is required.
5. Add event triggers for that workflow only after opt-in, deduplication, budgets, and disable controls exist.
6. Add provider cost/quality routing from measured telemetry and explicit policy; do not optimize blindly.
7. Add graph-derived fashion/business context only after an evidence-backed query gap remains after existing SQL and RAG paths are evaluated.
8. Add more agent roles, parallel collaboration, sandbox execution, voice, and creative modalities individually, each with its own approval, privacy, quota, reliability, and regression gates.

At each step, update the existing UI/API/service rather than creating parallel control centers, employee registries, memory stores, product/order records, provider-key forms, or moderation/review queues. An architectural component is justified only by a concrete workflow requirement and measurable acceptance criteria.

## Working change log

| Date | Change | Validation / remaining dependency |
|---|---|---|
| 2026-10-01 | Documented the agreed provider architecture and phased ModaGPT roadmap; recorded the current server-side DeepSeek/OpenAI/Gemini/Fal boundaries and the existing merchant workflow reuse rules. | Provider unit tests, full unit suite, TypeScript check, and production build passed in the current development session. OpenAI/Gemini/Fal live credentials and supplier connectivity are not verified. |
| 2026-10-01 | Expanded the roadmap to the ModaGPT V2 flagship target: supervisor/orchestration, Planner → Executor → Verifier, typed agent collaboration, provenance-aware memory/RAG/graph, opt-in event workflows, controlled sandboxing, governed evaluation, policy decisions, measured cost/quality routing, and AI-specific HA/DR. Added staged sequencing and explicit non-duplication/security acceptance gates. | Documentation-only update. These are target capabilities, not claims of current implementation. |
| 2026-10-01 | Extracted a shared deterministic AI answer verifier and applied it to existing product catalog, inventory, replenishment, and sales-summary responses without changing their data/permission sources. | Added synthetic verifier regression coverage; type check, focused AI Employee tests, full unit tests, and production build run for this delivery. This is one bounded Planner → Executor → Verifier slice, not the general supervisor or multi-agent runtime. |
| 2026-10-01 | Added process-local circuit breaking to configured DeepSeek/OpenAI/Gemini and Fal image/Try-On calls, preserving only explicitly configured fallback behavior. Added safe circuit snapshots to the existing admin provider-settings response. | Circuit policy and provider-fallback regression tests added. State is per Node process; shared cross-worker state, alerting, and durable AI workflow recovery remain future work. |
| 2026-10-01 | Fixed Gemini-to-Ollama vision fallback to use the local vision default instead of forwarding the Gemini model identifier to Ollama. | Added a provider-failure regression that asserts the local endpoint receives `llava:latest`; no UI or persisted setting change. |
| 2026-10-01 | Classified permanent provider HTTP errors separately from retryable outages so authentication/configuration failures do not open the shared provider circuit. | Added a regression with repeated DeepSeek 401 responses; fallback stays functional and the cloud route remains retryable after credentials are corrected. |
| 2026-10-01 | Surfaced the existing provider circuit snapshots in the current AI admin center so operators can distinguish open, half-open, closed, and not-yet-observed routes without a duplicate dashboard; status now refreshes every 30 seconds independently of editable configuration and supports manual refresh. | Added strict snapshot parsing and UI regression coverage. Circuit state remains process-local and is explicitly not presented as a live provider health check. |
| 2026-10-01 | Exposed bounded in-memory AI inference aggregates through the existing admin provider-settings endpoint and displayed attempts, failures, latency, and last outcome beside circuit status; added Fal image-generation and Try-On operation metrics through the same collector. | Added strict response parsing and metric recording tests. Metrics contain counts/timings only, remain process-local, and are not durable billing records. Fal connection self-tests are not included. |
| 2026-10-01 | Revalidated the current provider telemetry and ModaGPT changes and corrected the roadmap's Fal capability inventory to include the existing Try-On route while distinguishing implementation from live-provider verification. | Full unit suite passed (251 tests), production build passed, and `git diff --check` passed. Third-party `@privy-io/react-auth` Rollup annotation warnings remain non-fatal. |
| 2026-10-01 | Added the first opt-in Brain slice: additive Prisma models and migration, tenant-filtered Brain retrieval on the existing AI Employee path, assistant feedback persistence, and transactional `order.created` event enqueueing for the existing PostgreSQL worker. Verifier-passed experiences and deterministic completion evaluations are now captured for the existing read-only product, inventory/replenishment and sales workflows without persisting raw merchant prompts or answers. Recorded the Brain contract, runtime boundaries, feature-flag default, and migration index-name verification. | Prisma validation/client generation and generated-DDL comparison of all 45 relevant index/constraint names passed; all 264 unit tests, TypeScript check, production build, and `git diff --check` passed. Migration is validated but not applied; vector backend, parsers, broad event wiring, other employee workflow capture, outcome-linked lesson promotion and the automatic learning loop remain pending. Build emits existing Privy annotation and large-chunk warnings. |
| 2026-10-01 | Extended the transactional outbox to selected product, inventory, order, quote, Solana payment, creative-generation, and content-draft approval writes. Added a read-only low-inventory worker that rechecks current RUDA stock/sales, persists idempotent Brain experience/evaluation evidence, creates a high-risk review candidate after repeated verified success, and maintains a narrow product graph relation. Added a capability-gated supervisor before the existing AI Team planner. | Prisma validation/client generation and generated index DDL checks passed; all 274 unit tests, TypeScript check, production build, and `git diff --check` passed. The database migration is not applied and PostgreSQL transaction integration is not tested. The complete agent, workflow, tool-policy, approval, vector, sandbox, cost-router and DR systems are not implemented. Build emitted existing non-fatal Privy/Rollup annotation and bundle-size warnings. |
| 2026-10-01 | Routed the low-inventory worker through a typed Agent Context Protocol, bounded tool registry/executor, tenant-and-agent-grant Policy checks, approval gate, execution timeout and persisted EmployeeAuditLog lifecycle records. The live worker path performs an Inventory Procurement Manager → Sales & Customer Manager handoff, retrieves tenant-scoped Brain evidence before planning, executes a bounded plan, verifies deterministic results against RUDA source facts, and replans at most once on verification failure. Successful Experience/Evaluation records include the plan snapshot, replan count, Brain references, participating agents, tool results and trace. | All 288 unit tests passed; TypeScript check, production build, Prisma validation and `git diff --check` passed. No migration or frontend changes. This is one sequential read-only workflow, not a generic agent/workflow/approval platform; PostgreSQL integration and production behavior remain unverified. |
| 2026-10-01 | Added the first merchant-facing ModaGPT task API and connected the existing queue worker to the shared Supervisor, Agent Context, Tool Runtime, tenant/employee permissions, audit lifecycle and RUDA read-back verification for private product drafts and quote drafts. Draft retries are task-idempotent and reject changed payloads; product drafts must use an active merchant store category; quote amounts come from published merchant products and persisted approved-customer discounts. The task worker now starts independently of the optional Brain feature flag, so queued merchant tasks are not stranded when Brain is disabled. | Added focused runtime tests for both draft workflows, tenant isolation, audit and idempotency. Product publication, quote sending, approval persistence, generated product content/media, business analysis, Fashion Creative, attachments, AI credits and provider use remain unavailable. The endpoint requires structured product/quote facts and returns `needs_input` otherwise; it is not a free-form LLM execution path. |
| 2026-10-01 | Extended the existing merchant task Core with product draft updates, publish/unpublish tools gated by a durable tenant-scoped approval record, approval decisions, idempotent approval continuation tasks, stale-product snapshot checks, and post-write RUDA read-back validation. Added conservative extraction of an explicitly stated product name, wholesale price and MOQ from Chinese/English requests; missing category, style, retail price, pack size or SKU remain `needs_input`. | Product create/update/publish/unpublish through the shared Runtime and approval gate have mock-Prisma regression tests. Added the additive `ModaGptApproval` migration; it has not been applied to a deployment database. Quote modification/approval/send and read-only business analysis remain unimplemented; natural language does not yet generate a full product candidate or call an LLM. |
| 2026-10-01 | Added eight canonical Industry Packs with exactly four fixed Core employee assignments; added the tenant-scoped assignment/provision-run schema and additive migration; provisioned teams atomically during normal, quick-start, Google and admin Merchant creation; added permission-checked industry changes with audit; and loaded persisted team configuration into the existing AI Team and low-inventory runtime without treating pack recommendations as grants. | Prisma client generation and schema validation passed; all 291 unit tests, TypeScript check, production build and `git diff --check` passed. The Industry migration is not applied and registration/rollback/concurrency behavior has not been tested against PostgreSQL. Legacy Google and quick-start entry points default to Fashion Company unless quick-start supplies an Industry. Industry metadata does not implement missing tools, knowledge ingestion, workflow types or legacy employee installation/entitlement grants. |
| 2026-10-01 | Added a deterministic Master Supervisor task router for the five agreed merchant scenarios; it selects only assigned members of the fixed four Core employees and explicitly reports whether workflows, employees and tools are registered. Added a reusable sequential AgentContext handoff with bounded structured context and stable task/trace/tenant identity, and routed low-inventory execution through the shared router and handoff path without changing its read-only behavior. | Focused routing, multi-agent handoff and existing inventory workflow tests passed; TypeScript check passed. This is a shared Core foundation, not completion of the other four business workflows: product publish, customer quote, business analysis and fashion creative remain unavailable through this dispatcher until their real tool/workflow implementations are registered. No frontend or migration changes. |
| 2026-10-01 | Continued the existing merchant task workflow: strengthened product lifecycle read-back checks; added tenant-scoped quote update/submit/send tools behind snapshot-bound approvals and approval continuation tasks; wired quote delivery to the existing Resend adapter with a stable idempotency key. Delivery persists `SENDING` before provider execution and reaches `SENT` only after a valid Resend message ID, recording provider, recipient, task/trace IDs, result/failure evidence and audit. Stale quote/recipient approvals are invalidated and require a fresh approval. Added conservative quote-fact extraction and six read-only RUDA business-analysis tools through the same Tool Runtime. | New regression coverage includes send retry evidence, stale-snapshot reapproval, CAS conflict, and currency grouping. The final full-suite run is still pending after this patch. Resend has not been live-tested; PostgreSQL integration has not run; and the additive quote-delivery migration remains unapplied. The configured application database is not confirmed isolated, so no migration status or migration command was run. Product, Quote and Business Analysis are not production-verified. Quote natural-language resolution still requires merchant confirmation of customer/product/SKU and financial terms. |
| 2026-10-01 | Added a fail-closed check at Quote send approval decision time: an expired quote, non-approved customer, missing recipient, or non-approved quote status expires the pending approval instead of approving work that can no longer be sent. Added a regression that mutating an approved Product snapshot expires its approval and prevents publication. | Full unit suite passed (326 tests), `npm run build`, `npm run lint`, `npx prisma validate`, and `git diff --check` passed. The isolated PostgreSQL URL and dedicated Resend test recipient are not configured; therefore migration status/application and real delivery were not attempted. These backend workflows remain PARTIAL until the isolated PostgreSQL suite, migration and safe live Resend delivery are verified. |
| 2026-10-01 | Added nullable `SalesQuote.currency` with a non-destructive migration; draft creation/update persists only an explicitly supplied valid ISO currency, and currency participates in the approval snapshot. Currency-only changes are possible through the existing snapshot-bound approval while preserving stored items and notes. Quote send approvals and delivery fail closed when currency is absent; quote emails show the stored currency instead of assuming EUR. Old quotes remain currency-unknown until explicitly updated under approval. Also fixed approval request snapshot comparison when quote currency is changed. | Full unit suite passed (328 tests), including explicit-currency persistence, approved currency-only update, missing-currency send refusal, and Product stale-snapshot regressions; `npm run build`, `npm run lint`, `npx prisma validate`, and `git diff --check` passed. Quote-delivery and currency migrations are not applied; PostgreSQL integration is blocked because `BILLING_TEST_DATABASE_URL` is absent. Real Resend delivery is unverified because no dedicated test recipient is configured. |
| 2026-10-01 | Corrected business-analysis treatment of cancelled/returned orders and recorded refunds; invoice reporting is grouped by persisted status and currency. Fixed SEO middleware ordering by handling the primary root redirect before static serving and disabling static directory-index interception so locale and merchant-store SSR handlers can render. Expanded post-deploy smoke checks to validate all 12 locale homepages' title, `lang`, canonical and `hreflang`, the Italian root redirect, and public discovery file types/bodies. | Full unit suite passed (335 tests), `npm run lint`, production build, `npx prisma validate`, and `git diff --check` passed. Live production SEO remains broken until this build is deployed and the new smoke test passes. No isolated PostgreSQL, Resend, Stripe webhook, or recovery-drill configuration was available; those external/integration gates remain open. |
| 2026-10-01 | Corrected business-analysis aggregates so cancelled/returned orders do not inflate order, sales, product, or customer performance; reported persisted refunds separately; and grouped invoice totals by status and currency to avoid presenting void or otherwise non-paid invoice totals as recognized revenue. Added regressions with cancelled, returned, refunded, void-invoice, and cross-tenant fixtures. | `npm run test:unit` passed (333 tests), `npm run lint`, production build, `npx prisma validate`, and `git diff --check` passed. Public read-only checks confirmed discovery-file MIME types, but production locale pages `/en/`, `/fr/`, and `/zh/` currently return Italian HTML/canonical and `/` returns 200 instead of the source-configured redirect. This is a deployment/origin/CDN issue; no production changes were made. Isolated PostgreSQL and Resend test configuration are unavailable, so database integration and live delivery remain unverified. |
| 2026-10-01 | Expanded the post-deploy SEO smoke from locale homepages to all 60 locale/page combinations across home, catalog, showrooms, trends, and about; the page catalog is shared by the smoke script and regression tests. Each response must be HTML with the expected localized title, `lang`, Open Graph locale, canonical URL, and all 12 corresponding `hreflang` URLs; requests are sent in bounded batches. | The focused SEO tests passed (8 tests), including all 60 metadata combinations; the full unit suite passed (336 tests), `npm run lint`, production build, and `git diff --check` passed. Authorized production deployment created and verified a protected pre-deploy backup, applied the three pending additive migrations (all 82 now applied), restarted PM2, and passed the live post-deploy smoke for health/readiness, root redirect, all 60 localized pages, and discovery files. The PM2 process is online. PostgreSQL integration tests and real Resend quote delivery were not run. Build emitted existing non-fatal Rollup annotation and chunk-size warnings. |
| 2026-10-02 | Unified the existing PostgreSQL queue behind `ModaGptTaskRuntime` (keeping the old queue export as a compatibility alias); added tenant/actor/trace/parent/goal/priority/agent/context/plan persistence, canonical task states, priority claims, tenant-scoped idempotency with legacy-key replay fallback, approval pause/continuation, and active-phase lease recovery. Interactive product/quote tasks and transactional Outbox rows now carry the same execution metadata; no second queue or task table was added. | Task queue suite passed (13 tests), full unit suite passed (354 tests), `npm run lint`, `npm run build`, `npx prisma validate`, and `git diff --check` passed. Added migration `20261002130000_modagpt_task_runtime`; it was not applied. Only the application `DATABASE_URL` is configured; no isolated task/PostgreSQL integration URL exists. Prisma Store contract tests and simulated lease recovery are unit evidence, not real PostgreSQL migration, atomicity, or process-restart verification. Planning/verifying states are supported by the task contract/store but are not yet emitted by the current worker workflow. |
| 2026-10-02 | Connected lease-guarded `planning`, `running`, and `verifying` phase writes to the existing low-inventory review workflow; failed verification replans return to `planning`. The complete typed low-inventory plan is now persisted to the existing task `plan` field under the worker lease and refreshed for replanned versions. Provisioned an isolated local PostgreSQL 16 test database and added a durable task-store integration test. | Task/orchestration tests passed (19/19), PostgreSQL task/plan integration passed, `npm run lint`, `npm run build`, `npx prisma validate`, and `git diff --check` passed. All 84 migrations were applied only to `ruda_modagpt_test`; idempotency, plan lease binding, phase CAS, lease expiry/recovery, stale-worker rejection, and completion were exercised. No application DB was changed. Actual process restart, mid-step resume, and transaction rollback remain unverified. |

Update this log only for delivered code and actual validation results. Keep planned and credential-blocked items labeled as such.
