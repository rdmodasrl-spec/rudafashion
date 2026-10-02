# ModaGPT Billing Runtime

This documents the backend subscription slice currently implemented on top of
the existing ModaGPT Billing Core. It is not a claim of production payment
readiness; live credentials, tax registration, deployment, and provider-side
webhook verification must be completed before enabling purchases.

## Implemented

- Stripe is the only platform provider with recurring subscription Checkout.
  ModaGPT Billing accepts only Stripe Test Mode API keys (`sk_test_`) and
  rejects live-mode webhook events. Adyen, PayPal, and merchant-owned
  Stripe/PayPal payment settings are not ModaGPT subscription providers.
- `POST /api/billing/checkout` creates an idempotent local draft invoice and
  pending payment before creating Stripe Checkout in monthly subscription
  mode. Checkout is available only for an active plan explicitly enabled for
  purchase with positive monthly credits.
- Checkout completion redirects are informational only. Subscription access
  is granted only from a Stripe-signed `invoice.paid` webhook.
- `POST /api/billing/webhook/stripe` verifies Stripe's timestamped signature,
  persists and deduplicates webhook events, and atomically processes paid and
  failed invoices, subscription status, invoice/payment snapshots, and
  idempotent monthly credit grants.
- `customer.subscription.updated` synchronizes the provider status,
  cancellation-at-period-end, customer reference, and valid current period;
  `customer.subscription.deleted` closes the local subscription.
- Merchant owners can schedule cancellation or resume it through
  `POST /api/billing/subscription/cancel` and
  `POST /api/billing/subscription/resume`. Employee sessions are denied.
- The merchant plan sheet now reads the five canonical plans from
  `GET /api/merchant/modagpt/plans`, including configured prices, plan feature
  flags, current subscription status, AI Credit Ledger balance, and whether
  checkout is currently permitted. It no longer advertises the obsolete
  Free/Pro/Studio price table or unsupported top-up packs.
- The same catalog response reports platform-enabled billing features. A plan
  is shown as purchasable only when the Stripe Test Mode readiness gate passes,
  the plan is explicitly enabled, its monthly credit allowance is configured,
  and the merchant has no active subscription (plan changes are not yet
  supported). Admins may enable a plan only while the full test checkout gate
  is ready; this cannot enable live Stripe purchases.
- The existing ModaGPT image/Try-On route uses the Billing Credit Ledger for
  merchants with a persisted billing subscription. It reserves before
  generation, consumes and records usage after a successful result, and
  releases the reservation on failure. Requests using this path must provide
  an `Idempotency-Key`.
- Paid-plan merchant assistant chat also reserves and settles `ai.basic_chat`
  credits in the same transaction as conversation persistence and usage
  recording. Free merchants continue to use their existing monthly chat
  quota. Billing-backed chat and image requests require idempotency keys.
- The additive `20261002140000_configure_modagpt_plan_credit_allowances`
  migration configures monthly grants as PLUS 2,000, PRO 6,000, BUSINESS
  12,000, and FASHION_PRO 25,000 Credits. FREE retains its existing quota
  model and has no monthly ledger grant. The existing admin plan API can
  change future configured grants; paid subscriptions receive the allowance
  recorded in their immutable plan snapshot.
- Feature credit costs remain server-configured in `ModaGptBillingFeature`.
  `creditCost` is the fallback per request; optional `config.creditPricing`
  supports units and model overrides, for example:
  `{"creditPricing":{"unit":"video_second","default":{"creditsPerUnit":2,"unitsPerCredit":5},"models":{"fal/video-model":{"creditsPerUnit":4,"unitsPerCredit":5}}}}`.
  Supported units are request, token, image, video-second, and voice-second.
  A feature remains unavailable unless its entitlement, registry enablement,
  and positive cost are configured. Do not enable metering until its provider
  cost and margin have been reviewed.
- Billing invoice records now retain provider invoice IDs, period boundaries,
  billing country, tax ID snapshot, tax amount, and an effective tax rate when
  Stripe reports one. Merchant deletion is restricted when durable Billing
  records exist.

## Configuration and enablement

Server configuration is read from environment variables and never accepted
from the browser:

- `PAYMENT_PROVIDER=stripe`
- `PAYMENT_ENABLED=true`
- `PAYMENT_PROVIDER_SECRET` (Stripe server API key)
- `PAYMENT_WEBHOOK_SECRET` (Stripe signing secret; distinct from the API key)
- `BILLING_STRIPE_AUTOMATIC_TAX=true`
- `MODAGPT_BILLING_TEST_PURCHASES_ENABLED=true` only for a deliberately
  enabled internal Stripe Test Mode purchase test; default is `false`
- `APP_URL` (canonical HTTPS application origin)

`PAYMENT_PROVIDER_SECRET` must use the `sk_test_` prefix for Billing. A live
Stripe key cannot create a ModaGPT subscription, and the billing webhook
rejects events unless Stripe marks them as `livemode: false`. Keep existing
non-Billing payment flows separate; this Test Mode restriction applies to
ModaGPT recurring Billing.

Configure Stripe Tax and register the applicable tax jurisdictions before
setting `BILLING_STRIPE_AUTOMATIC_TAX=true`. Register Stripe to send
`invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and
`customer.subscription.deleted` to `/api/billing/webhook/stripe`.

Purchases remain disabled by default (`MODAGPT_BILLING_TEST_PURCHASES_ENABLED`
is false and plan `purchaseEnabled` remains false). Enabling the environment
flag alone does not enable checkout: provider readiness and the selected plan's
explicit purchase flag are also required. Never set a live key or use this
internal test gate as authorization for production purchases.

## Deliberate limitations

The implementation is a testable Stripe recurring-payment slice, not a
Billing Production Beta. It has not been exercised against a Stripe
test-mode account. This work did not apply or verify Billing migrations in an
application database; each deployed environment still needs its own
migration-status check and backup. The following remain unimplemented or
incomplete:

- Upgrade/downgrade and proration flows; a merchant with an existing
  subscription cannot start a second subscription through Checkout.
- Provider-driven retry scheduling and a configured grace-period policy;
  Stripe's own retry behavior is reflected only through paid/failed invoices.
- Refund lifecycle and credit reversals, Billing reconciliation, configurable
  tax rules outside Stripe Tax, and credit expiry/rollover enforcement.
- Billing Credit Ledger integration for all AI routes; currently paid-plan
  assistant chat and merchant image/Try-On are connected. Other AI workflows,
  voice, and video generation have no complete billing-aware execution path.
- Per-feature/per-model credit prices are intentionally not guessed or enabled
  by the allowance migration. Configure and validate each cost before enabling
  the feature; subscription credits alone do not imply that the AI capability
  is available.
- The plan sheet describes plan positioning; it does not claim that every
  advertised business capability is operational. Globally disabled features
  remain unavailable regardless of plan entitlements.
- Actual provider cost attribution for image generation
  (`actualCostMinor` remains null); assistant chat provider/model attribution
  is not yet reported. Complete Invoice presentation/export also remains open.
- Stripe Test Mode acceptance tests, PostgreSQL transaction integration
  tests, deployment of pending migrations, and operations/alerting runbooks.

The plan-sheet and catalog-API changes do not require a database migration.
The isolated local PostgreSQL database used for prior queue integration work
is not the application database and provides no evidence that a Billing
migration has been applied to a deployed environment. Until the gaps above,
explicit credit allowances, Stripe Test Mode acceptance, tax/legal review,
and production requirements are closed, do not advertise the service as
accepting live ModaGPT subscriptions.
