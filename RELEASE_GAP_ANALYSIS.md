# Release Gap Analysis — WOP Ministry Platform

**Date:** 2026-06-17  
**Reference checklists:** `RELEASE_BLOCKERS_CHECKLIST.md`, `API_VALIDATION_CHECKLIST.md`, `ADMIN_SMOKE_TEST_CHECKLIST.md`, `MOBILE_SMOKE_TEST_CHECKLIST.md`, `PAYMENT_VALIDATION_CHECKLIST.md`  
**Companion:** `RELEASE_AUDIT_REPORT.md`

This document maps **checklist requirements** to **observed repository state** and classifies gaps.

Legend: ✅ Implemented · ⚠️ Partial · ❌ Missing · 🔧 Config-only · 📋 Doc-only

---

## 1. Authentication & RBAC

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| API-AUTH-01–09 | Register, login, refresh, me | ✅ `auth.service.ts`, 140 API tests | None in code | — |
| API-AUTH-10–11 | Password reset | ⚠️ Requires SMTP; empty in env templates | 🔧 SMTP not configured | High |
| RB-AUTH-02 | Wrong password → 401 | ✅ Implemented | — | — |
| RB-AUTH-03 | USER → admin route → 403 | ✅ `RolesGuard` | — | — |
| RB-AUTH-05 | Rate limit → 429 | ✅ Throttle on auth routes; spec exists | — | — |
| RB-AUTH-06 | API npm audit clean | ⚠️ 35 vulns (5 high) in API | Dependency debt | Medium |
| RB-AUTH-06 | Admin npm audit | ❌ 11 vulns (1 critical, 8 high) | SEC-003 open | **Critical** |
| M-AUTH-04 | Session refresh on mobile | ✅ `auth_provider.dart` | Device not verified | Medium |
| A-AUTH-01 | Admin login | ⚠️ Any role can authenticate | ❌ No minimum ADMIN role at login | **Critical** |
| — | Disabled user login blocked | ❌ `login()` ignores `deletedAt` | Security gap | **Critical** |
| A-NTF (MODERATOR) | Notifications admin | ⚠️ UI allows MODERATOR; API ADMIN-only | RBAC mismatch | High |
| eBooks MODERATOR | Admin eBooks | ⚠️ API MODERATOR+; nav excludes | Inconsistent policy | High |

---

## 2. User management

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| A-USR-01–04 | List, role, status | ✅ Admin UI + API wired | — | — |
| A-USR-05 | MODERATOR blocked from `/users` | ✅ Middleware | — | — |
| — | Revoke sessions on disable | ❌ Refresh tokens remain until expiry | Partial disable | High |
| — | SUPER_ADMIN in dropdown for ADMIN | ⚠️ UI shows option; API rejects | UX confusion | Medium |

---

## 3. Subscription entitlement enforcement

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| PAY-SUB-04 | Premium content unlocked | ⚠️ eBooks only | Clips/programs ungated | High |
| API-SUB-06 | `content/validate` entitlement | ⚠️ Token crypto only | No live subscription check | High |
| SUB-E2E-02 | Purchase → active | ❌ Plan code mismatch | Checkout fails on seeded DB | **Critical** |
| SUB-E2E-05 | Expiration blocks access | ⚠️ eBook path checks subscription status | Clips/programs ignore | High |
| — | `userHasPremiumAccess()` | ❌ Dead code (unused) | No shared guard | Medium |
| PAY-REN-02 | Renewal webhook | ❌ Lifecycle retry stub (`amount: 0`) | No real renewal | **Critical** |

**Files:** `subscriptions.service.ts`, `content-access.service.ts`, `ebooks.service.ts` (enforced), `clips.service.ts` / `programs.service.ts` (not enforced).

---

## 4. Flutterwave payment flow

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| RB-PAY-01 | Credentials configured | ❌ Empty in env templates | 🔧 Deployment | **Critical** |
| PAY-SUB-01–03 | Checkout + status + entitlement | ⚠️ Code complete; unit tested | Plan codes + env + redirect | **Critical** |
| PAY-WH-01–03 | Webhook verify + idempotency | ⚠️ Event-ID dedup only | No tx SUCCESS guard | High |
| PAY-WH-05 | Poll before webhook | ❌ No Flutterwave verify API | Stuck PENDING risk | High |
| — | `/payments/complete` redirect | ❌ URL generated, no route | Post-pay 404 | **Critical** |
| PAY-EBK-01–04 | eBook checkout | ⚠️ Same as subscription | Env + currency hardcoded USD | High |

**Files:** `payments.service.ts` (`checkoutRedirectUrl`), `flutterwave.provider.ts`, `subscription_service.dart` (`_planCode` → `PREMIUM`), `seed.ts` (`BASIC_MONTHLY`).

---

## 5. FCM push delivery

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| RB-NTF-01 | FCM credentials | ❌ Empty in env templates | 🔧 Deployment | **Critical** |
| RB-NTF-04 | Broadcast → sendBroadcast | ✅ Fixed in `notifications.service.ts` | — | — |
| RB-NTF-06 | Push retry cron | ❌ `retryDueDeliveries()` never scheduled | No `@Cron` / worker | High |
| M-NTF-02 | Token registration | ⚠️ Implemented; fire-and-forget | Race on fast logout | Medium |
| RB-NTF-05 | iOS APNs production | ❌ `aps-environment: development` | Deferred per plan | High (prod) |
| NTF-E2E-06 | Deep link cold start | ✅ Buffered in mobile (prior fix) | Device not verified | Medium |

---

## 6. Environment variable consistency

| Source | Issue | Severity |
|--------|-------|----------|
| `.env.staging.example` vs `.env.production.example` | FCM, Flutterwave, SMTP empty in both | **Critical** (expected — must set at deploy) |
| `apps/mobile-flutter/.env.example` | Port 4000 documented | Medium |
| `auth_service.dart` default | Port **3000** on `10.0.2.2` | Medium — doc/code drift |
| `CONTENT_ACCESS_SECRET` | Dev fallback to JWT secret in code | High if unset in prod |
| `PAYMENT_REDIRECT_BASE_URL` | Points to API path; `/payments/complete` missing | **Critical** |
| Docker prod compose | Overrides `DATABASE_URL`, `REDIS_URL` internally | ✅ Consistent |
| Admin `NEXT_PUBLIC_*` | Build-time embed | Must match deployed API/WS URLs | High |

---

## 7. Prisma schema vs database

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| RB-DR-04 | Migrations applied | ✅ 14 migrations; local `up to date` | Staging/prod not verified | Medium |
| PAY-DB-01–03 | Payment row integrity | ⚠️ Schema supports; E2E not run | Manual SQL checks pending | Medium |
| — | Seed data vs mobile | ❌ Plan codes misaligned | **Critical** for payments |

**Migrations include:** events, clips, ebooks, subscriptions, policies, programs, mentorship (20260610–20260611 series).

---

## 8. Docker deployment readiness

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| RB-INF-06 | Compose healthy | ✅ `docker-compose.prod.yml` structured | Not run in audit | Medium |
| RB-INF-07 | TLS / nginx | ⚠️ `infra/nginx/certs` mount | Cert provisioning external | High |
| — | `.env.production` | Not in repo (gitignored) | Expected; must exist on host | Medium |
| docker-compose.dev | Observability stack | ✅ Prometheus, Grafana, exporters | Dev-only | — |
| — | Mobile not in compose | N/A | Mobile built separately | — |

---

## 9. Mobile production configuration

| Checklist ref | Requirement | Observed state | Gap | Severity |
|---------------|-------------|----------------|-----|----------|
| RB-MOB-01 | Release build | ⚠️ Tests pass; analyze 23 infos | No errors | Low |
| RB-MOB-02 | API_BASE_URL dart-define | ❌ Wrong default if omitted | **Critical** |
| RB-MOB-03 | Firebase configs | ✅ Present for `com.ministrymobile.app` | — | — |
| RB-MOB-06 | Bundle ID | ✅ Consistent | — | — |
| M-SUB-02 | Payment flow | ⚠️ External browser + manual refresh | UX gap | Medium |

---

## 10. iOS release readiness

| Item | State | Gap | Severity |
|------|-------|-----|----------|
| `aps-environment` | `development` | Must be `production` for App Store / prod push | **Critical** |
| Push capability | Entitlements file present | Provisioning profile not verified | High |
| `GoogleService-Info.plist` | Present | APNs key in Firebase Console — manual | High |
| CI iOS build | Not verified in audit | — | Medium |

**Reference:** `IOS_PUSH_NOTIFICATION_CHECKLIST.md` — overall **NOT READY** for prod push.

---

## 11. Android release readiness

| Item | State | Gap | Severity |
|------|-------|-----|----------|
| Release signing | `signingConfig = debug` | Play Store rejection | **Critical** |
| `google-services.json` | Present under `app/` | Duplicate at `android/` root | Low |
| `applicationId` | `com.ministrymobile.app` | OK | — |
| Target SDK | Flutter default | Not audited against Play policy | Medium |

---

## 12. Module-by-module gap matrix

| Module | Backend | Admin UI | Mobile UI | E2E validated | Primary gap |
|--------|---------|----------|-----------|---------------|-------------|
| Auth | ✅ | ⚠️ | ✅ | 📋 | Admin accepts USER; disabled login |
| Users | ✅ | ✅ | N/A | 📋 | Session revoke on disable |
| Announcements | ✅ | ✅ | ✅ | 📋 | Manual smoke pending |
| Events | ✅ | ✅ | ✅ | ⚠️ | RSVP fixed; device smoke pending |
| Clips | ✅ | ✅ | ✅ | 📋 | No premium gate |
| eBooks/Library | ✅ | ✅ | ✅ | 📋 | Payment env |
| Subscriptions | ⚠️ | ✅ | ⚠️ | ❌ | Plan codes + renewal |
| Payments | ⚠️ | ✅ | ⚠️ | ❌ | Redirect + env + idempotency |
| Notifications | ✅ | ⚠️ | ✅ | 📋 | MODERATOR RBAC |
| Push/FCM | ⚠️ | N/A | ✅ | ❌ | Env + retry cron |
| Programs | ✅ | ✅ | ✅ | 📋 | No premium gate |
| Mentorship | ✅ | ✅ | ✅ | 📋 | — |
| Policies | ✅ | ✅ | ✅ | 📋 | — |
| Analytics | ✅ | ✅ | N/A | 📋 | — |
| Content hub | N/A | ❌ placeholder | N/A | N/A | Accepted risk |

---

## 13. Gap summary by severity

| Severity | Count | Release impact |
|----------|-------|----------------|
| **Critical** | 11 | Block production; block payment/push E2E |
| **High** | 18 | Block prod or require signed acceptance |
| **Medium** | 15 | Beta acceptable with tracking |
| **Low** | 8 | Backlog |

---

## 14. Checklist execution status

| Checklist | Items (approx.) | Executed | Pass | Fail | Blocked |
|-----------|-----------------|----------|------|------|---------|
| RELEASE_BLOCKERS | 56 | 0 manual | — | — | Infrastructure unverified on staging |
| API_VALIDATION | 80+ | Partial (automated unit) | 140 tests | Plan code E2E | Staging creds |
| ADMIN_SMOKE | 60+ | 0 | — | — | — |
| MOBILE_SMOKE | 50+ | 0 | — | — | — |
| PAYMENT_VALIDATION | 30+ | 0 | — | — | Flutterwave env |

**Primary gap:** Validation **framework exists** but **manual/staging execution has not been completed**.

---

## Revision history

| Version | Date |
|---------|------|
| 1.0 | 2026-06-17 |
