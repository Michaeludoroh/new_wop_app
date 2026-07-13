# User Journey Validation Report

**Date:** 2026-06-17  
**Platform:** WOP Ministry Platform  
**Scope:** Critical ministry workflows — mobile member app + admin dashboard + API  
**Audit type:** Static code review, automated test results, cross-reference of prior audits (no live browser/E2E in this session)

---

## Executive Summary

| Perspective | Journeys audited | Code-complete | Automated tests | Device/E2E verified |
|-------------|------------------|---------------|-----------------|---------------------|
| **Mobile member** | 14 | 12 PASS, 2 PARTIAL | **54/54** widget/unit pass | Not run |
| **Admin operator** | 15 | 13 PASS, 1 PARTIAL, 1 FAIL | **5/5** admin Vitest; backend specs present | Not run |
| **Cross-platform (publish → consume)** | 7 content types | Wired in code | Partial (announcement push tests) | Not run |

### Overall Go / No-Go

| Context | Verdict |
|---------|---------|
| **Internal staging QA (code + unit tests)** | **GO** — core journeys implemented on both sides |
| **Moderator/admin production operations** | **CONDITIONAL GO** — RBAC gaps, no E2E proof |
| **Member-facing production launch** | **NO-GO** — dashboard tab UX incomplete, FCM/SMTP unset, no device journey validation |
| **Full platform launch (admin + mobile + push + payments)** | **NO-GO** — external credentials, E2E, and known defects below |

---

## Validation Methodology

| Evidence type | Source |
|---------------|--------|
| Mobile screens & routes | `apps/mobile-flutter/lib/screens/**`, `lib/core/router/app_router.dart` |
| Admin screens & routes | `apps/admin-web/app/(protected)/**` |
| API contracts | `services/api/src/modules/**` |
| Mobile automated tests | `flutter test` → **54/54 passed** (this audit) |
| Admin automated tests | `npm test` → **5/5 passed** (analytics normalize only) |
| Backend service tests | Per-module `*.service.spec.ts` |
| Prior audits | `ADMIN_PLATFORM_AUDIT_REPORT.md`, `BACKEND_NOTIFICATION_AUDIT.md`, `FIREBASE_RUNTIME_AUDIT_REPORT.md`, `DEVICE_SMOKE_TEST_PLAN.md` |

**Not in scope for this run:** Live login on staging, screenshot capture, payment provider webhooks, physical push delivery.

---

## Critical Workflow Index

### Member (mobile) journeys

| # | Journey | Route(s) | Validation |
|---|---------|----------|------------|
| M1 | Onboarding & auth | Splash → login/register/forgot/reset | §M1 |
| M2 | Session persistence | Cold start restore | §M1 |
| M3 | Dashboard navigation | 5-tab shell | §M3 |
| M4 | Events discover & RSVP | `/events`, `/events/details` | §M4 |
| M5 | Clips watch | `/clips`, `/clips/details` | §M5 |
| M6 | Library & eBooks | `/library`, `/ebooks`, reader | §M6 |
| M7 | Programs enroll | `/programs`, `/programs/details` | §M7 |
| M8 | Mentorship enroll | `/mentorship`, `/mentorship/details` | §M8 |
| M9 | Announcements read | `/announcements`, details | §M9 |
| M10 | Subscription & premium | `/subscriptions` | §M10 |
| M11 | Notifications & push | `/notifications`, FCM deep-links | §M11 |
| M12 | Policies accept | Dialog + `/policies/*` | §M12 |
| M13 | Profile & About | `/profile`, `/about` | §M13 |
| M14 | Logout | Dashboard app bar | §M1 |

### Admin journeys

| # | Journey | Route | Validation |
|---|---------|-------|------------|
| A1 | Admin login & session | `/login` | §A1 |
| A2 | Dashboard & analytics | `/`, `/analytics` | §A2 |
| A3 | User management | `/users` | §A3 |
| A4 | Announcements publish | `/announcements` | §A4 |
| A5 | Events publish | `/events` | §A5 |
| A6 | Clips publish | `/clips` | §A6 |
| A7 | eBooks / library admin | `/ebooks` | §A7 |
| A8 | Programs admin | `/programs` | §A8 |
| A9 | Mentorship admin | `/mentorship` | §A9 |
| A10 | Subscriptions admin | `/subscriptions` | §A10 |
| A11 | Notifications send | `/notifications` | §A11 |
| A12 | Policies publish | `/policies` | §A12 |
| A13 | Payments reconciliation | `/payments` | §A13 |
| A14 | RBAC enforcement | All routes | §A14 |
| A15 | Content hub | `/content` | §A15 |

### Cross-platform publish → consume

| Content | Admin publish | Mobile consume | Push/realtime |
|---------|---------------|----------------|---------------|
| Announcements | A4 | M9 | Yes (backend) |
| Events | A5 | M4 | No |
| Clips | A6 | M5 | No |
| eBooks | A7 | M6 | No |
| Programs | A8 | M7 | No |
| Mentorship | A9 | M8 | No |
| Policies | A12 | M12 | No |

---

## Member Journeys (Mobile)

**App:** `apps/mobile-flutter`  
**API default:** `http://10.0.2.2:3000/api/v1` (override via `--dart-define=API_BASE_URL`)

---

### §M1 — Authentication & Session — **PASS**

| Step | User action | System behavior | API |
|------|-------------|-----------------|-----|
| 1 | Open app (logged out) | Splash → auth landing | — |
| 2 | Register | Form validation → account created | `POST /auth/register` |
| 3 | Login | Tokens stored securely | `POST /auth/login` |
| 4 | Cold start (logged in) | Bootstrap restores session | `GET /auth/me`, `POST /auth/refresh` |
| 5 | Forgot password | Email submitted | `POST /auth/forgot-password` |
| 6 | Reset password | New password set | `POST /auth/reset-password` |
| 7 | Logout | Tokens cleared, FCM revoked | `POST /auth/logout`, `POST /push/device-token/revoke` |

**Evidence:** `auth_provider.dart`, `auth_service.dart`; tests: `login_screen_test`, `register_screen_test`, `forgot_password_screen_test`, `reset_password_screen_test`, `auth_provider_bootstrap_test` (4), `auth_provider_refresh_test` (3), `home_screen_logout_test`, `app_splash_routing_test` (3).

**Defects:** No widget test for auth landing screen; login navigation relies on app-level home swap (not explicit `Navigator` pop).

**Go/No-Go:** **GO**

---

### §M3 — Dashboard & Tab Navigation — **PARTIAL PASS**

| Tab | Label | Content | Status |
|-----|-------|---------|--------|
| 0 | Dashboard | Summary cards + CTAs | Stub cards, not live data |
| 1 | Events | Link to `/events` | Stub — not embedded list |
| 2 | Clips | Link to `/clips` | Stub |
| 3 | Library | Links to `/library`, `/ebooks` | Stub |
| 4 | More | Full `MoreScreen` | **PASS** |

**Evidence:** `dashboard_screen.dart`; app bar: notifications badge, profile, logout; FCM listeners bound post-frame.

**Defects:** Tabs 0–3 are navigation shortcuts, not native tab experiences; no tab-switch widget tests.

**Go/No-Go:** **CONDITIONAL GO** — functional but not polished for production UX

---

### §M4 — Events Discover & RSVP — **PASS** (with defect)

| Step | User action | API |
|------|-------------|-----|
| 1 | Browse events | `GET /events/public`, `/public/featured` |
| 2 | Open details | `GET /events/public/:id` |
| 3 | RSVP toggle | `POST /events/:id/rsvp`, `DELETE /events/:id/rsvp` |
| 4 | Share event | Local clipboard (no API) |

**Evidence:** `events_screen.dart`, `event_details_screen.dart`; test: `events_screen_test` (empty state only).

**Defects:** RSVP UI state `_rsvped` initializes `false` — **not hydrated from API**; user may see wrong RSVP button state after revisit.

**Go/No-Go:** **CONDITIONAL GO** — fix RSVP hydration before production

---

### §M5 — Clips Watch — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | Browse/search clips | `GET /clips/public`, `/public/featured` |
| 2 | Filter favorites | Local `SharedPreferences` |
| 3 | Play video | `GET /clips/public/:id` + `video_player` |

**Evidence:** `clips_screen.dart`, `clip_details_screen.dart`.

**Defects:** **No widget tests**; `ClipService` not injectable for testing.

**Go/No-Go:** **GO** (code); **NO-GO** (test coverage)

---

### §M6 — Library & eBooks — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | My library | `GET /library`, `/ebooks/recently-read` |
| 2 | Browse catalog | `GET /ebooks` |
| 3 | View details | `GET /ebooks/:id` |
| 4 | Purchase / checkout | `POST /ebooks/purchase`, `POST /payments/checkout/ebook` |
| 5 | Read PDF | `GET /ebooks/:id/access`, stream URL, `POST /ebooks/:id/progress` |

**Evidence:** `my_library_screen.dart`, `ebook_screen.dart`, `ebook_details_screen.dart`, `pdf_reader_screen.dart`; tests: `ebook_library_screens_test`.

**Defects:** No purchase/reader flow tests; premium gating depends on subscription + `CONTENT_ACCESS_SECRET` on API.

**Go/No-Go:** **CONDITIONAL GO** — requires payment + content-access env on staging

---

### §M7 — Programs Enroll — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | Browse programs | `GET /programs/public` |
| 2 | Enroll / cancel | `POST /programs/:id/enroll`, `DELETE .../enroll` |
| 3 | Track progress | `GET/PATCH /programs/me/:id/progress` |

**Evidence:** `programs_screen.dart`, `program_details_screen.dart`; test: `programs_screen_test`.

**Defects:** Enrollment status inferred from progress API; no details-screen test.

**Go/No-Go:** **GO**

---

### §M8 — Mentorship Enroll — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | Browse classes | `GET /mentorship/public` |
| 2 | View sessions | `GET /mentorship/public/:id/sessions` |
| 3 | Enroll | `POST /mentorship/:id/enroll` |
| 4 | Attendance & feedback | `GET/PATCH` me endpoints, `POST .../feedback` |

**Evidence:** `mentorship_screen.dart`, `mentorship_details_screen.dart`; test: `mentorship_screen_test`.

**Defects:** No details-screen test; richest screen with least test coverage.

**Go/No-Go:** **GO**

---

### §M9 — Announcements Read — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | List announcements | `GET /announcements/public` |
| 2 | Filter categories | `GET /announcements/public/categories` |
| 3 | Read details | `GET /announcements/public/:id` |

**Evidence:** `announcements_screen.dart`, `announcement_details_screen.dart`; test: `announcements_screen_test`.

**Defects:** No details test; depends on admin publish (A4).

**Go/No-Go:** **GO**

---

### §M10 — Subscription & Premium — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | View status & plans | `GET /subscriptions/status`, `/subscriptions/plans` |
| 2 | Subscribe | `POST /subscriptions/subscribe`, `POST /payments/checkout/subscription` |
| 3 | Cancel | `POST /subscriptions/cancel` |
| 4 | Grace period UX | Status-driven messaging |

**Evidence:** `subscription_screen.dart`; test: `subscription_screen_test` (grace period).

**Defects:** External checkout via `url_launcher` — not tested; payment webhooks required for status sync.

**Go/No-Go:** **CONDITIONAL GO** — payment provider config required

---

### §M11 — Notifications & Push — **PASS** (device E2E pending)

| Step | User action | API / infra |
|------|-------------|-------------|
| 1 | View inbox | `GET /notifications`, `PATCH .../read-state` |
| 2 | Realtime updates | Socket.IO events |
| 3 | Register FCM token | `POST /push/device-token/register` |
| 4 | Receive foreground push | FCM → SnackBar on dashboard |
| 5 | Tap notification | `PushNotificationRouter` → detail routes |
| 6 | Cold-start tap | Buffered via `markOpenedMessageListenersReady()` |

**Evidence:** `notifications_screen.dart`, `firebase_messaging_service.dart`, `push_notification_router.dart`; tests: `push_notification_router_test` (7), `firebase_messaging_service_test` (3).

**Defects:** No `notifications_screen_test`; FCM/APNs not device-validated; backend broadcast PUSH gap (see `BACKEND_NOTIFICATION_AUDIT.md` N1).

**Go/No-Go:** **CONDITIONAL GO** — run `DEVICE_SMOKE_TEST_PLAN.md`

---

### §M12 — Policies Accept — **PASS**

| Step | User action | API |
|------|-------------|-----|
| 1 | Prompt on dashboard entry | `GET /policies/me/status` |
| 2 | Read policy | `GET /policies/public/current/:type` |
| 3 | Accept | `POST /policies/me/accept` |

**Evidence:** `policy_acceptance_dialog.dart`, `policy_screen.dart`, typed policy screens.

**Defects:** No widget tests; silent failure if status load fails.

**Go/No-Go:** **GO**

---

### §M13 — Profile & About — **PARTIAL PASS**

| Journey | Status | Notes |
|---------|--------|-------|
| About WOP | **PASS** | Branding, org, developers, version — `about_screen_test` |
| Profile | **PARTIAL** | Policy links only — no user info/edit — `profile_screen_test` |
| More menu | **PASS** | Nav to all ministry features — `more_screen_test` (6 tests) |

**Coming Soon (disabled):** Sermons, Donations, Prayer Requests, Live Streaming, Courses, Premium Content (`more_screen.dart`).

**Go/No-Go:** **GO** for About/More; Profile is policies hub only

---

## Admin Journeys

**App:** `apps/admin-web` (Next.js 14, port 3001)  
**API default:** `http://localhost:4000/api/v1`

---

### §A1 — Admin Login & Session — **PASS**

| Step | Action | API |
|------|--------|-----|
| 1 | Login | `POST /auth/login` |
| 2 | Bootstrap | `GET /auth/me` |
| 3 | Token refresh | `POST /auth/refresh` |
| 4 | Logout | `POST /auth/logout` |

**Evidence:** `auth-provider.tsx`, `middleware.ts`, `http-client.ts`.

**Defects:** 403 on any API call clears full session (A1); no admin auth unit tests.

**Go/No-Go:** **GO**

---

### §A2 — Dashboard & Analytics — **PASS**

| Surface | Roles | API |
|---------|-------|-----|
| Home KPIs | ADMIN+ | `/analytics/dashboard`, `/growth`, `/activity`, `/top-content` |
| Analytics page | ADMIN+ | `/analytics/summary`, `/operational`, `/report` |
| Moderator home | MODERATOR | Module links only (no KPIs) |

**Evidence:** `page.tsx`, `analytics/page.tsx`; Vitest: `normalize.test.ts` (5 tests).

**Go/No-Go:** **GO**

---

### §A3 — User Management — **PASS**

**Flow:** Search → view → change role → enable/disable  
**API:** `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status`  
**Roles:** SUPER_ADMIN, ADMIN  
**Backend tests:** `users.service.spec.ts` ✓

**Go/No-Go:** **GO**

---

### §A4 — Announcements Publish — **PASS**

**Flow:** Create draft → upload image → publish → (backend) in-app + push + realtime  
**API:** Full `/announcements/admin/*` CRUD + publish + upload  
**Mobile impact:** M9 + M11 push on publish  
**Backend tests:** `announcements.service.spec.ts`, `notifications.service.spec.ts` ✓

**Cross-journey validation:**

```
Admin publish → deliverPublishedAnnouncement()
  → Notification record + Socket.IO + pushService.sendBroadcast()
Mobile → GET /announcements/public + optional FCM tap → /announcements/details
```

**Go/No-Go:** **CONDITIONAL GO** — FCM creds required for push leg

---

### §A5 — Events Publish — **PASS**

**Flow:** CRUD → publish → view attendees  
**API:** `/events/admin/*`, `GET /events/admin/:id/attendees`  
**Mobile impact:** M4 RSVP  
**Gap:** Banner URL-only (no upload)

**Go/No-Go:** **GO**

---

### §A6 — Clips Publish — **PASS**

**Flow:** CRUD → publish (video/thumbnail URLs)  
**API:** `/clips/admin/*`  
**Mobile impact:** M5  
**Gap:** No file upload in admin

**Go/No-Go:** **GO** (URL workflow)

---

### §A7 — eBooks / Library Admin — **PASS**

**Flow:** Upload PDF/cover → CRUD → publish → analytics  
**API:** `/ebooks/admin/*`, upload endpoints  
**Mobile impact:** M6  
**RBAC defect:** Page allows MODERATOR but middleware blocks `/ebooks`

**Go/No-Go:** **GO** (ADMIN+)

---

### §A8 — Programs Admin — **PASS**

**Flow:** CRUD → publish → enrollments → progress → analytics  
**API:** `/programs/admin/*`  
**Mobile impact:** M7

**Go/No-Go:** **GO**

---

### §A9 — Mentorship Admin — **PASS**

**Flow:** Class CRUD → sessions → attendance → feedback → analytics  
**API:** Full `/mentorship/admin/*` suite  
**Mobile impact:** M8

**Go/No-Go:** **GO**

---

### §A10 — Subscriptions Admin — **PARTIAL PASS**

**Flow:** List subscribers → analytics → status change → cancel → lifecycle job  
**API wired:** `/subscriptions/admin`, analytics, lifecycle, status, cancel  
**Not wired:** plan CRUD, subscription detail/history  
**Mobile impact:** M10

**Go/No-Go:** **CONDITIONAL GO** — monitoring OK; plan management incomplete

---

### §A11 — Notifications Send — **PARTIAL PASS**

**Flow:** View feed → broadcast/targeted compose (ADMIN+)  
**API:** `POST /notifications/broadcast`, `/targeted`  
**Channels:** IN_APP ✓, EMAIL (SMTP-dependent), PUSH (targeted ✓, **broadcast PUSH broken** — backend N1)  
**Mobile impact:** M11

**Go/No-Go:** **CONDITIONAL GO**

---

### §A12 — Policies Publish — **PASS**

**Flow:** CRUD → publish readiness check → publish → acceptance analytics  
**API:** `/policies/admin/*`  
**Mobile impact:** M12 policy acceptance gate

**Go/No-Go:** **GO**

---

### §A13 — Payments Reconciliation — **PASS** (read-only)

**Flow:** View payment history + webhook events  
**API:** `GET /payments/history`, `/payments/webhook-events`  
**Mobile impact:** M6/M10 checkout flows (user-initiated)

**Go/No-Go:** **GO** for observability

---

### §A14 — RBAC — **PARTIAL PASS**

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Middleware | Cookie + `ROLE_ROUTE_MAP` | ✓ |
| Nav filter | Role-based sidebar | ✓ |
| Page | `ProtectedModule` | ✓ (eBooks mismatch) |
| API | JwtAuthGuard + hierarchical RolesGuard | ✓ |
| Tests | `route-security.spec.ts` | **4/4 pass** |

**Go/No-Go:** **CONDITIONAL GO**

---

### §A15 — Content Hub — **FAIL**

**Route:** `/content` — `ModulePage` placeholder only; no API integration.  
Individual modules (A4–A7, A12) cover real workflows separately.

**Go/No-Go:** **NO-GO** as unified moderation hub

---

## Cross-Platform Journey Matrix

End-to-end: **Admin creates & publishes → Member discovers & engages**

| Workflow | Admin | API bridge | Mobile | Automated test | E2E | Verdict |
|----------|-------|------------|--------|----------------|-----|---------|
| Announcement → read + push | A4 publish | `deliverPublishedAnnouncement` | M9 + M11 | Backend ✓ | ✗ | **CONDITIONAL** |
| Event → RSVP | A5 publish | Public filter | M4 RSVP | Mobile partial | ✗ | **CONDITIONAL** (RSVP bug) |
| Clip → watch | A6 publish | Public filter | M5 play | None | ✗ | **CONDITIONAL** |
| eBook → purchase/read | A7 publish | Content access | M6 checkout | Mobile partial | ✗ | **CONDITIONAL** |
| Program → enroll | A8 publish | Enroll endpoints | M7 enroll | Mobile partial | ✗ | **CONDITIONAL** |
| Mentorship → enroll | A9 publish | Sessions API | M8 enroll | Mobile partial | ✗ | **CONDITIONAL** |
| Policy → accept | A12 publish | Acceptance tracking | M12 dialog | None | ✗ | **CONDITIONAL** |
| Admin notify → push | A11 targeted PUSH | `sendToUser` | M11 | Router ✓ | ✗ | **CONDITIONAL** |
| Admin broadcast PUSH | A11 broadcast PUSH | **Broken (N1)** | M11 | ✗ | ✗ | **FAIL** |
| User subscribe → premium | A10 monitor | Payment webhooks | M10 checkout | Grace test only | ✗ | **CONDITIONAL** |

---

## Infrastructure Dependencies (Journey Blockers)

| Dependency | Affects journeys | Local status | Staging ready |
|------------|------------------|--------------|---------------|
| `DATABASE_URL` | All | Required | Template ✓ |
| `JWT_*` secrets | M1, A1 | Required | Template ✓ |
| `FIREBASE_SERVICE_ACCOUNT_JSON` / `FCM_*` | M11, A4 push, A11 PUSH | **Not set** | **FAIL** |
| APNs in Firebase | iOS push (M11) | Manual | **MANUAL** |
| `SMTP_*` | A11 EMAIL, auth emails | **Not set** (mock) | **FAIL** |
| Payment provider keys | M6, M10 | Placeholders | **FAIL** |
| `CONTENT_ACCESS_SECRET` | M6 streaming | Template ✓ | Verify set |
| `API_BASE_URL` dart-define | All mobile | Dev default | Staging doc ✓ |
| Push retry cron | Failed push retry | **Not wired** | **FAIL** |

---

## Test Coverage Summary

### Mobile (`flutter test`)

| Result | **54/54 passed** |
|--------|------------------|
| Auth & routing | 18+ tests |
| List empty-states | Events, programs, mentorship, announcements, library |
| Push routing + cold-start buffer | 10 tests |
| About, More, Profile, Subscription | Covered |
| **Missing** | Clips, notifications UI, policies, all detail screens, dashboard tabs, E2E |

### Admin

| Result | **5/5 Vitest** (analytics normalize only) |
|--------|-------------------------------------------|
| **Missing** | All module UI tests, E2E, auth flows; tests not in CI |

### Backend

| Module | Service spec |
|--------|--------------|
| Auth, users, announcements, events, clips, ebooks, programs, mentorship, subscriptions, notifications, payments, policies, push | ✓ Present |
| Route security RBAC | **4/4 pass** |

---

## Defects Blocking Production Journeys

| ID | Severity | Journey impact | Description |
|----|----------|----------------|-------------|
| J1 | **High** | M11, A11 | Backend broadcast PUSH not sent (`BACKEND_NOTIFICATION_AUDIT` N1) |
| J2 | **High** | M11, A4 | Firebase Admin creds not configured |
| J3 | **High** | All E2E | No browser/device journey validation performed |
| J4 | **Medium** | M4 | Event RSVP state not loaded from API |
| J5 | **Medium** | M3 | Dashboard tabs are stubs, not embedded experiences |
| J6 | **Medium** | A14, A7 | eBooks RBAC mismatch (MODERATOR) |
| J7 | **Medium** | A1 | HTTP 403 clears admin session |
| J8 | **Medium** | M6, M10 | Payment/checkout not integration-tested |
| J9 | **Low** | M13 | Profile is policies-only |
| J10 | **Low** | A15 | Content hub placeholder |

---

## Journey Go / No-Go Summary

| Journey | Member | Admin | Cross-platform E2E |
|---------|--------|-------|-------------------|
| Auth & session | **GO** | **GO** | Not verified |
| Dashboard home | **CONDITIONAL** | **GO** | — |
| Events | **CONDITIONAL** | **GO** | Not verified |
| Clips | **GO** | **GO** | Not verified |
| Library/eBooks | **CONDITIONAL** | **GO** | Not verified |
| Programs | **GO** | **GO** | Not verified |
| Mentorship | **GO** | **GO** | Not verified |
| Announcements | **GO** | **GO** | **CONDITIONAL** (push) |
| Subscriptions | **CONDITIONAL** | **CONDITIONAL** | Not verified |
| Notifications/push | **CONDITIONAL** | **CONDITIONAL** | **FAIL** (broadcast push) |
| Policies | **GO** | **GO** | Not verified |
| Users admin | — | **GO** | — |
| Analytics | — | **GO** | — |
| Payments recon | — | **GO** | Not verified |
| Content hub | — | **FAIL** | — |

---

## Recommended Validation Sequence (Manual QA)

Use this order for staging sign-off:

1. **A1 → M1** — Admin + member login/logout/session restore  
2. **A12 → M12** — Publish all policy types → mobile acceptance dialog  
3. **A4 → M9 → M11** — Publish announcement → mobile list + push tap  
4. **A5 → M4** — Publish event → RSVP (verify RSVP state after fix)  
5. **A8 → M7** — Publish program → enroll → admin sees enrollment  
6. **A9 → M8** — Publish mentorship → enroll → session attendance  
7. **A7 → M6** — Publish eBook → purchase → PDF read  
8. **A6 → M5** — Publish clip → play video  
9. **A11 → M11** — Targeted notification (IN_APP + PUSH)  
10. **A10 → M10** — Subscription checkout → premium content access  

Templates: `DEVICE_SMOKE_TEST_PLAN.md` (mobile push), admin checklist in `ADMIN_PLATFORM_AUDIT_REPORT.md`.

---

## Final Recommendation

The WOP platform implements **nearly all critical ministry journeys in code** on both mobile and admin sides. **Authentication, content CRUD/publish, enrollment, library, and policy acceptance** are structurally complete. **Automated mobile tests pass (54/54)**; backend service tests exist for all modules.

**Proceed** with structured staging QA using the manual sequence above.

**Do not launch to production** until:

1. Firebase Admin + SMTP + payment credentials are on staging  
2. Broadcast PUSH defect (N1) is fixed  
3. Event RSVP hydration (J4) is fixed  
4. Device/browser E2E validates top 5 cross-platform workflows  
5. Push smoke tests pass per `DEVICE_SMOKE_TEST_PLAN.md`

---

## Related Reports

| Report | Focus |
|--------|-------|
| `ADMIN_PLATFORM_AUDIT_REPORT.md` | Admin module audit |
| `BACKEND_NOTIFICATION_AUDIT.md` | FCM, SMTP, queues |
| `FIREBASE_RUNTIME_AUDIT_REPORT.md` | Mobile Firebase init |
| `DEVICE_SMOKE_TEST_PLAN.md` | Push device validation |
| `IOS_PUSH_NOTIFICATION_CHECKLIST.md` | APNs setup |
| `PUSH_RELIABILITY_FIX_REPORT.md` | Cold-start push fixes |
