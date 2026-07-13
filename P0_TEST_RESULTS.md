# P0 Test Results — WOPP

**Date:** 2026-06-17  
**Executed after:** P0 implementation (ACT-001–006 + renewal)

---

## Automated test summary

| Suite | Command | Result |
|-------|---------|--------|
| API (Jest) | `cd services/api && npx jest --config jest.config.js` | **147/147 PASS** |
| Flutter | `cd apps/mobile-flutter && flutter test` | **55/55 PASS** |

**Delta from baseline:** +7 API tests (140 → 147)

---

## New / updated test coverage

### ACT-002 — Payment completion
**File:** `services/api/src/modules/payments/payments.service.spec.ts`

| Test | Result |
|------|--------|
| Returns success when transaction already completed | PASS |
| Verifies pending payment with Flutterwave and activates entitlement | PASS |

### ACT-004 — Disabled-user auth
**File:** `services/api/src/modules/auth/auth.service.spec.ts`

| Test | Result |
|------|--------|
| Rejects login for users with `deletedAt` set | PASS |
| Allows login for active users | PASS |
| Rejects refresh for disabled users | PASS |

### ACT-004 — Token revocation on disable
**File:** `services/api/src/modules/users/users.service.spec.ts`

| Test | Result |
|------|--------|
| Revokes refresh tokens when disabling a user | PASS |

### Renewal workflow
**File:** `services/api/src/modules/subscriptions/subscription-lifecycle.service.spec.ts`

| Test | Result |
|------|--------|
| Charges Flutterwave tokenized renewal with plan amount (not zero) | PASS |
| Records status history | PASS |
| Processes due lifecycle events breakdown | PASS |

### Existing regression suites (unchanged pass rate)
- Payments webhook idempotency + amount verification — PASS
- JWT strategy disabled-user rejection — PASS
- Beta smoke integration specs — PASS
- Notifications / push / events — PASS

---

## Manual / staging tests (ACT-006 — not executed)

The following require a provisioned staging environment (ACT-003):

- [ ] Flutterwave sandbox checkout end-to-end with redirect to `/payments/complete`
- [ ] Admin login with USER account → rejected
- [ ] Disabled user mobile login → rejected
- [ ] Premium checkout with `PREMIUM` plan on fresh seeded DB
- [ ] Push notification delivery with FCM credentials

---

## Per-fix test execution log

| Fix | Tests run immediately after | Outcome |
|-----|----------------------------|---------|
| ACT-001 mobile plan resolution | Full Flutter suite | 55/55 PASS |
| ACT-002 payment complete | `payments.service.spec.ts` + full API | PASS |
| ACT-004 auth guards | `auth.service.spec.ts`, `users.service.spec.ts` + full API | PASS |
| ACT-005 admin gate | Manual code review; no admin-web unit suite in repo | N/A |
| Renewal lifecycle | `subscription-lifecycle.service.spec.ts` + full API | PASS |
| Final verification | Full API + Flutter | 147 + 55 PASS |
