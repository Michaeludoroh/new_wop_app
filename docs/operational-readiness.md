# Operational Readiness Report (Canonical)

## Scope
This document is the canonical operational source of truth for current platform readiness across:
- Backend/API
- Admin-web
- Flutter
- Auth/RBAC/runtime controls
- Payments + Subscriptions transactional lifecycle hardening
- Transition readiness into Notifications workflow expansion

---

## Payments + Subscriptions Final Operational Summary

### Completed Runtime Validations
Executed and verified in active runtime:
- API build/start:
  - `npm run build` successful
  - `npm run start:dev` successful, routes mapped
- Auth runtime prerequisite:
  - `/api/v1/auth/login` with seeded SUPER_ADMIN returns valid access/refresh tokens
- Webhook runtime matrix (PowerShell-native requests) across providers:
  - Flutterwave
  - Stripe
  - Paystack
- Scenarios executed:
  - successful webhook submissions
  - failed signature submissions
  - duplicate replay submissions
  - malformed payload conditions (missing required fields)
  - invalid provider
  - unknown provider reference / not-found reference
  - unauthorized submission (missing auth token)

Observed response classes:
- 201 (including duplicate-safe replay acknowledgements)
- 400 (validation/signature/payload class)
- 401 (unauthorized)
- 404 (provider reference not found)

### Replay / Idempotency Guarantees
Verified behavior indicates:
- Replayed events with same `externalEventId` are handled as duplicates.
- Duplicate side effects are prevented at runtime.
- Replay responses return deterministic duplicate metadata instead of creating new business effects.

### Provider Abstraction Parity Findings
Provider adapters (Flutterwave/Stripe/Paystack) now emit normalized failure/retry metadata:
- `failureCode`
- `failureMessage`
- `retryable`

Parity conclusion:
- Providers map to a common normalized event contract.
- Runtime behavior across providers is deterministic for tested matrix scenarios.

### Malformed Payload Handling Guarantees
Validated malformed categories:
- missing `eventId`
- missing `providerReference`
- invalid provider value
- invalid signature class
Findings:
- malformed inputs are rejected with error status classes (400/404 as applicable).
- no duplicate transactional side effects observed from malformed/rejected inputs.

### Transactional Lifecycle Protections
Implemented and validated behavior includes:
- retry lifecycle fields persisted
- retry scheduling (`nextRetryAt`) and counters (`retryCount`)
- retry exhaustion signaling path
- subscription lifecycle coupling to payment outcomes:
  - success → ACTIVE
  - retryable failures → PAST_DUE (where applicable)
  - exhausted failures → cancellation path

### DB Integrity Guarantees
Executed verification script:
- `node tmp-verify-webhook-matrix.cjs`
Confirmed for baseline references:
- webhook events persisted with duplicate processing status where replayed
- transactions persisted without duplicate rows for same references
- subscription linkage remains intact
- no duplicate subscription side effects for validated matrix set

### RBAC / Runtime Guarantees
Verified:
- unauthorized webhook access receives 401
- guarded endpoint access enforced in runtime flow
- auth token prerequisite for protected mutations is functioning

### Duplicate Side-Effect Prevention Guarantees
For validated event IDs and provider references:
- no duplicate transaction creations observed
- no duplicate subscription mutations observed
- duplicate webhook submissions return duplicate-safe response semantics

---

## Runtime / Test Coverage Summary

### Backend/API Coverage
Covered:
- auth login prerequisite
- payments webhook endpoint across three providers
- replay, malformed, unauthorized, unknown-reference classes
- DB post-conditions for core event/transaction/subscription relations

### Admin-web Coverage
Status:
- payments/subscriptions deep runtime UX pass deferred for immediate phase transition request.
- baseline auth/runtime infrastructure exists; no new blocking backend regression identified for transition.

### Flutter Coverage
Status:
- no new Flutter runtime regression surfaced in this payments/subscriptions closure pass.
- notifications-focused Flutter validation deferred to next phase implementation.

### Prisma Integrity Verification Coverage
Covered:
- event/transaction/subscription integrity checks on known matrix references.
- deterministic persistence for tested reference set.

### Remaining Low-Risk Deferred Areas
- additional fresh-event failed-path lifecycle sweeps for exhaustive retry-exhaustion permutations
- broader no-orphan queries across full DB (beyond validated fixed references)
- deeper admin-web payments/subscriptions UX edge traversal
- expanded structured error-body snapshot assertions for all error classes

These are classified as low-risk deferred items given current tested guarantees and no blocking integrity regressions in validated paths.

---

## Security Scan Findings (Active Surface + Related)
Security-focused review highlights:
1) Notifications controller currently accepts raw `Record<string, unknown>` payload for create.
   - Risk: weak schema guarantees, potential unsafe/over-broad writes if downstream service is permissive.
2) Notifications create endpoint currently allows both ADMIN and USER roles.
   - Risk: unauthorized broadcast or privilege confusion if role intent is not explicitly split.
3) DTO-level validation hardening is required for notifications create/update/read-state lifecycle endpoints.

Action:
- Notifications phase begins with DTO + RBAC tightening before broad feature expansion.

---

## Known Technical Debt / Caveats

### Environmental / Tooling Caveats
1) PowerShell curl alias caveat
   - Native `curl` maps to `Invoke-WebRequest`; `-H/-d` syntax mismatch can break commands.
   - Mitigation: use `Invoke-RestMethod` / `Invoke-WebRequest` explicitly in runtime scripts.

2) Prisma Windows EPERM file-lock caveat
   - `prisma generate` may fail with Windows file lock (`query_engine-windows.dll.node`) during active process contention.
   - Mitigation: stop locking processes or retry in clean terminal/session.

### Optional Lifecycle Enhancements (Deferred)
- deeper retry-exhaustion matrix permutations with fresh synthetic references
- expanded structured error-contract snapshots for each malformed class
- wider subscription expiry/trial boundary synthetic test matrix

### Admin-web Runtime UX Debt (Deferred)
- deeper payments/subscriptions UI retry visibility and stale-session micro-interaction polish
- additional network-failure UX instrumentation and synthetic session-expiry journey assertions

---

## Deployment / Operational Prerequisites

### Required Provider Secrets / Config
- Stripe, Flutterwave, Paystack secrets/signatures configured per environment
- JWT access/refresh secrets + expiry configuration
- auth/session stale/retry limits aligned with production policy

### Webhook Endpoint Requirements
- stable public webhook ingress for `/api/v1/payments/webhook`
- provider signature validation enabled in production
- replay-safe event IDs preserved from provider payloads

### Production Env Variables (Minimum Class)
- JWT access/refresh secrets and expiries
- provider credentials + webhook verification secrets
- retry/session policy variables
- database connection and migration readiness

### Retry / Idempotency Operational Assumptions
- unique event identity (`externalEventId`) remains provider-stable
- provider reference lookup remains deterministic and indexed
- transaction + subscription write paths preserve idempotent semantics

### DB / Runtime Requirements
- Prisma schema/migrations consistent with runtime models
- transactionality and write ordering preserved under concurrent webhooks
- monitoring/alerting on webhook failure and retry backlog

---

## Readiness Classification

### Backend/API Readiness
**Classification: READY (stabilized for current payments/subscriptions scope)**  
Rationale:
- runtime matrix completed across providers and key error classes
- replay/idempotency behavior validated
- DB integrity verified for core references

### Admin-web Readiness
**Classification: CONDITIONALLY READY**  
Rationale:
- no new backend-blocking issues
- deeper payments/subscriptions UX hardening deferred by sequencing decision

### Flutter Readiness
**Classification: CONDITIONALLY READY**  
Rationale:
- no blocking payment lifecycle regressions surfaced in this closure
- notifications-specific UX/runtime validation deferred to next phase

### Transactional / Payment Readiness
**Classification: READY WITH LOW-RISK DEFERRED DEBT**  
Rationale:
- core transactional protections and duplicate prevention validated
- remaining deferred areas are enhancement-depth, not blocker-level

---

## Transition Section

## Next Expansion Phase: Notifications Workflow System

Immediate next implementation order (stabilization-first):
1. Backend/API
   - notification entity/model
   - persistence layer
   - unread/read lifecycle
   - admin broadcast notifications
   - user-targeted notifications
   - RBAC tightening
   - DTO validation
   - centralized notification service architecture
   - provider abstraction preparation (push/email/SMS-ready structure)

2. Admin-web
   - notifications management module
   - broadcast creation UI
   - read/unread visibility
   - loading/error/empty states
   - auth/session-expiry consistency

3. Flutter
   - notification center screen
   - unread badge handling
   - read/unread actions
   - persistence rendering
   - auth/session interruption handling

Quality strategy:
- critical-path runtime validation first
- targeted RBAC/runtime testing second
- avoid ultra-deep transactional re-testing unless notification lifecycle changes payment semantics
