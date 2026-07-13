# P0 Implementation Report — WOP Ministry Platform

**Date:** 2026-06-17  
**Scope:** ACT-001 through ACT-006 (P0 only) + subscription renewal hardening  
**Baseline readiness:** 68% (`RELEASE_AUDIT_REPORT.md`)

---

## Summary

All code-level P0 blockers were implemented. Staging secrets (ACT-003) and manual smoke execution (ACT-006) remain operational/QA tasks documented below.

| Action | Status | Notes |
|--------|--------|-------|
| ACT-001 Plan code alignment | **Done** | Seed already had `FREE`/`PREMIUM`; mobile now resolves codes from API with fallback |
| ACT-002 Payment completion | **Done** | `GET /payments/complete?tx_ref=` with verify + entitlement activation |
| ACT-003 Staging secrets | **Ops pending** | Documented in `RELEASE_READINESS_DELTA.md` |
| ACT-004 Disabled-user login | **Done** | Login, refresh, and `/auth/me` reject `deletedAt` users; tokens revoked on disable |
| ACT-005 Admin role gate | **Done** | USER role blocked at login and middleware |
| ACT-006 Staging smoke tests | **QA pending** | Automated suites green; manual staging checklists not executed |
| Renewal workflow | **Done** | Tokenized Flutterwave renewal replaces `amount: 0` placeholder |

---

## ACT-001 — Subscription plan code alignment

### Problem
Mobile hardcoded `PREMIUM`/`FREE` while some environments only had `BASIC_MONTHLY`, causing `PLAN_NOT_FOUND` on checkout.

### Fix
1. **Seed** (`services/api/src/prisma/seed.ts`): Confirmed `FREE`, `PREMIUM`, `PARTNER`, and legacy `BASIC_MONTHLY` plans.
2. **Mobile** (`subscription_service.dart`): Added `resolvePlanCode()` — loads plans from `GET /subscriptions/plans`, matches by tier + billing interval, falls back to static codes.
3. **Models** (`subscription_models.dart`, `subscription_screen.dart`): Map `BASIC`/`BASIC_MONTHLY` to premium tier.

---

## ACT-002 — Payment completion redirect

### New endpoint
`GET /api/v1/payments/complete?tx_ref={providerReference}&format=json`

- Public route (no JWT) — used as Flutterwave redirect target.
- Default response: minimal HTML success/failure/pending page.
- `format=json`: structured JSON for programmatic polling.

### Flow
1. Load local `paymentTransaction` by `tx_ref`.
2. If already `SUCCESS` → return success immediately.
3. If `PENDING` → call Flutterwave `verify_by_reference`.
4. On verified success → reconcile (activate subscription / eBook entitlement), persist Flutterwave token on subscription metadata.
5. On verified failure → mark transaction failed.
6. On still pending → instruct user to return to app.

### Files
- `payments.controller.ts` — route handler
- `payments.service.ts` — `completeCheckout()`, `reconcileVerifiedPayment()`, `buildCompletionHtml()`
- `flutterwave.provider.ts` — `verifyTransactionByReference()`, `chargeTokenizedPayment()`

---

## ACT-004 — Disabled-user login protection

### Changes
- `auth.service.ts`: Reject login/refresh/me when `user.deletedAt != null` with `UnauthorizedException('Account disabled')`.
- `users.service.ts`: Revoke all active refresh tokens when admin disables a user.

### Tests
- `auth.service.spec.ts` — login + refresh disabled-user cases
- `users.service.spec.ts` — token revocation on disable

---

## ACT-005 — Admin portal role restriction

### Changes
- `auth-provider.tsx`: After login/bootstrap `me()`, reject roles outside `SUPER_ADMIN | ADMIN | MODERATOR`; clear session on failure.
- `middleware.ts`: Redirect USER-role cookies to `/login?reason=insufficient_role` and clear session cookies.

---

## Subscription renewal (P0 extension)

### Problem
`processDueLifecycleEvents()` created `RETRY_CHARGE` transactions with `amount: 0`.

### Fix
- Inject `PaymentProviderRegistry` into `SubscriptionLifecycleService`.
- On grace retry: load plan amount, charge saved `flutterwaveToken` via Flutterwave tokenized charges API.
- Success → extend subscription period, reset retry count.
- Failure → schedule next retry or cancel after max attempts.
- Webhook/completion paths now persist `flutterwaveToken` in subscription metadata for future renewals.

### Tests
- `subscription-lifecycle.service.spec.ts` — verifies plan amount + tokenized charge call

---

## ACT-003 / ACT-006 — Not implemented in code

| Item | Owner | Action |
|------|-------|--------|
| ACT-003 | DevOps | Populate staging `.env` per `.env.staging.example` (FCM, Flutterwave, SMTP, JWT) |
| ACT-006 | QA | Run `MOBILE_SMOKE`, `ADMIN_SMOKE`, `API_VALIDATION`, `PAYMENT_VALIDATION` on staging |

---

## API behavior changes (documented)

| Endpoint | Change |
|----------|--------|
| `GET /payments/complete` | **New** public completion handler |
| `POST /auth/login` | Returns 401 for disabled accounts (was issuing tokens) |
| `POST /auth/refresh` | Returns 401 for disabled accounts |
| `GET /auth/me` | Returns 401 for disabled accounts |
| Admin web login | USER role rejected client-side + middleware |

Existing authenticated API contracts preserved unless noted above.
