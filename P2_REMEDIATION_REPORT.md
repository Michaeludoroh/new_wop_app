# P2 Remediation Report — Production Readiness Sprint 1

**Date:** 2026-06-19  
**Scope:** Resolve all 10 open P2 defects from `DEFECT_MATRIX.md`  
**Constraints:** No new features; business logic unchanged except where required for fixes; all existing tests preserved

---

## Executive summary

All 10 P2 defects identified in the module audit have been remediated. Validation completed successfully across API, admin-web, and Flutter layers. Defect counts after sprint:

| Priority | Open |
|----------|------|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| P3 | 8 (enhancements only) |

---

## Remediation detail

### P2-001 — Flutter profile service + edit UI

**Problem:** `/users/:id/profile` existed on the API but was unused in the mobile app; users could not edit their display name.

**Fix:**
- Added `UsersService` with `updateProfile()` calling `PATCH /users/:id/profile`
- Extended `ProfileScreen` with name field, save action, and status/error feedback
- Added `AuthProvider.reloadCurrentUser()` to refresh session after profile save
- Updated `profile_screen_test.dart` with `AuthScope` and authenticated mock provider

**Files:** `apps/mobile-flutter/lib/core/users/users_service.dart`, `apps/mobile-flutter/lib/screens/profile_screen.dart`, `apps/mobile-flutter/lib/core/auth/auth_provider.dart`, `apps/mobile-flutter/test/profile_screen_test.dart`

---

### P2-002 — Admin 403 triggers full logout

**Problem:** Any HTTP 403 in admin-web triggered `broadcastSessionInvalidated("forbidden")`, logging the user out on permission-denied errors.

**Fix:** 403 responses now reject the promise without session invalidation. Only 401 (after refresh retry exhaustion) triggers logout.

**Files:** `apps/admin-web/lib/auth/http-client.ts`

---

### P2-003 — RBAC ADMIN vs MODERATOR inconsistency

**Problem:** Role requirements differed across modules without documented rationale, causing confusion for staff access.

**Fix:** Added `services/api/docs/RBAC_ROLE_MATRIX.md` documenting intentional per-module `@Roles` requirements and admin-web route alignment. No role decorator changes — behavior preserved, expectations clarified.

**Files:** `services/api/docs/RBAC_ROLE_MATRIX.md`

---

### P2-004 — Content page placeholder

**Problem:** `/content` route was a stub with no navigation value.

**Fix:** Replaced placeholder with a Content Management hub linking to announcements, clips, eBooks, policies, events, programs, and mentorship modules.

**Files:** `apps/admin-web/app/(protected)/content/page.tsx`

---

### P2-005 — No global Flutter 401 refresh

**Problem:** Individual services handled auth independently; expired tokens caused failed requests without automatic refresh.

**Fix:** Introduced shared `AuthenticatedDio` with request interceptor (token injection + proactive refresh) and response interceptor (401 retry with refresh). Migrated services: clips, subscriptions, events, announcements, programs, mentorship, policies, ebooks.

**Files:** `apps/mobile-flutter/lib/core/http/authenticated_dio.dart`, plus refactored service files under `apps/mobile-flutter/lib/core/`

---

### P2-006 — Local-only clip favorites

**Problem:** Favorites were stored in `SharedPreferences` only — no cross-device sync and misleading UX.

**Fix:** Removed local favorites feature from clip service and UI (list + detail screens) until a backend favorites API exists (tracked as future P3 enhancement if desired).

**Files:** `apps/mobile-flutter/lib/core/clips/clip_service.dart`, `apps/mobile-flutter/lib/screens/clips_screen.dart`, `apps/mobile-flutter/lib/screens/clip_details_screen.dart`

---

### P2-007 — Subscriber detail/history missing in admin

**Problem:** Admin subscriptions page lacked per-subscriber detail and payment history visibility.

**Fix:** Extended subscriptions API client with `fetchSubscriberDetail()` and `fetchSubscriberHistory()`. Added expandable detail panel on subscriptions page showing status, plan, dates, and transaction history.

**Files:** `apps/admin-web/lib/subscriptions/api-client.ts`, `apps/admin-web/lib/subscriptions/types.ts`, `apps/admin-web/app/(protected)/subscriptions/page.tsx`

---

### P2-008 — Clips media upload missing

**Problem:** Admin clips required manual URL entry; no upload flow like announcements.

**Fix:**
- **API:** Added `ClipsUploadService` and controller routes for media/thumbnail upload (mirrors announcements pattern)
- **Admin:** Added upload controls on clips page with progress and URL population

**Files:** `services/api/src/modules/clips/clips-upload.service.ts`, `services/api/src/modules/clips/clips.controller.ts`, `services/api/src/modules/clips/clips.module.ts`, `apps/admin-web/lib/clips/api-client.ts`, `apps/admin-web/app/(protected)/clips/page.tsx`

---

### P2-009 — Weak Axios error parsing

**Problem:** Most admin CRUD pages surfaced generic error messages; notifications module had a better pattern.

**Fix:** Added shared `normalizeError()` utility and applied it to users, subscriptions, clips, events, and notifications hooks/pages for consistent API error messages.

**Files:** `apps/admin-web/lib/http/normalize-error.ts`, `apps/admin-web/app/(protected)/users/page.tsx`, `apps/admin-web/app/(protected)/subscriptions/page.tsx`, `apps/admin-web/app/(protected)/clips/page.tsx`, `apps/admin-web/app/(protected)/events/page.tsx`, `apps/admin-web/lib/notifications/hooks.ts`

---

### P2-010 — Content validate unused in Flutter

**Problem:** `GET /subscriptions/content/validate` was not called before gated content access.

**Fix:** Added `SubscriptionService.validateContentAccess()` and wired it into `EbookService.getAccess()` when a `streamToken` is present, validating entitlement before returning access.

**Files:** `apps/mobile-flutter/lib/core/subscriptions/subscription_service.dart`, `apps/mobile-flutter/lib/core/ebooks/ebook_service.dart`

---

## Validation results

| Check | Command | Result |
|-------|---------|--------|
| API unit tests | `services/api npm test` | **PASS** — 171/171 |
| API build | `services/api npm run build` | **PASS** |
| Admin production build | `apps/admin-web npm run build` | **PASS** |
| Flutter tests | `apps/mobile-flutter flutter test` | **PASS** — 61/61 |

---

## Test maintenance

One test required update as a consequence of P2-001 (not a regression):

- `profile_screen_test.dart` — wrapped `ProfileScreen` in `AuthScope` with mock authenticated provider (matches pattern in `app_splash_routing_test.dart`)

---

## Out of scope (P3 enhancements)

The following remain documented as P3 enhancements only — not blockers for this sprint:

- P3-001: Duplicate `/library` and `/ebooks/library` endpoints
- P3-002: `GET /subscriptions/me` duplicates `GET /subscriptions/status`
- P3-003: Clips view-count increment route
- P3-004: Programs enrollment list in Flutter UI
- P3-005: Mentorship public mentors + enrollments UI enrichment
- P3-006: Notification deep-link detail by ID
- P3-007: Fine-grained permissions table
- P3-008: Email verification flow
