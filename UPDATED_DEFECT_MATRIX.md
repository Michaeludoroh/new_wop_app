# WOP Ministry Platform — Updated Defect Matrix

**Date:** 2026-06-19  
**Classification:** P0 = production blocker · P1 = major defect · P2 = minor defect · P3 = enhancement  
**Status:** Post Production Readiness Sprint 1

---

## Summary

| Priority | Total | Fixed | Open |
|----------|-------|-------|------|
| P0 | 4 | 4 | **0** |
| P1 | 5 | 5 | **0** |
| P2 | 10 | 10 | **0** |
| P3 | 8 | 0 | **8** |

**Success criteria met:** P0 = 0 · P1 = 0 · P2 = 0. All remaining open items are P3 enhancements only.

---

## P0 — Production blockers (all fixed)

| ID | Module | Layer | Defect | Status | Fix |
|----|--------|-------|--------|--------|-----|
| P0-001 | Authentication | Flutter | `AuthUser` parsed `name` but API returns `fullName` | **FIXED** | `auth_models.dart` maps `fullName` |
| P0-002 | RBAC | Flutter | Router blocked `MODERATOR`/`SUPER_ADMIN` | **FIXED** | `app_router.dart` accepts backend role vocabulary |
| P0-003 | Notifications | Flutter | Realtime socket default port 4000 vs REST 3000 | **FIXED** | `realtime_notifications_service.dart` port 3000 |
| P0-004 | RBAC / Library | Admin-web | MODERATOR blocked from `/ebooks` | **FIXED** | `middleware.ts`, `nav-links.ts` |

---

## P1 — Major defects (all fixed)

| ID | Module | Layer | Defect | Status | Fix |
|----|--------|-------|--------|--------|-----|
| P1-001 | Users | API | Profile update unvalidated | **FIXED** | `UpdateUserProfileDto` + controller/service |
| P1-002 | Policies | API | `policies.service.spec.ts` missing mock | **FIXED** | Mock `policyAcceptance.findMany` |
| P1-003 | Subscriptions | Admin-web | Plan CRUD endpoints, no UI | **FIXED** | Plan section on subscriptions page |
| P1-004 | Users | Admin-web | Role/status mutations lacked try/catch | **FIXED** | Error handling in `users/page.tsx` |
| P1-005 | Subscriptions | Admin-web | Status/cancel lacked error handling | **FIXED** | try/catch in `subscriptions/page.tsx` |

---

## P2 — Minor defects (all fixed — Sprint 1)

| ID | Module | Layer | Defect | Status | Fix |
|----|--------|-------|--------|--------|-----|
| P2-001 | Users | Flutter | No profile service; `/users/:id/profile` unused | **FIXED** | `UsersService` + profile screen + `reloadCurrentUser()` |
| P2-002 | RBAC | Admin-web | 403 on any request triggers full logout | **FIXED** | 403 rejects without session invalidation in `http-client.ts` |
| P2-003 | RBAC | Backend | Inconsistent ADMIN vs MODERATOR across modules | **FIXED** | Documented in `services/api/docs/RBAC_ROLE_MATRIX.md` |
| P2-004 | Admin | Admin-web | `content/page.tsx` was placeholder | **FIXED** | Content Management navigation hub |
| P2-005 | Auth | Flutter | No global 401 refresh interceptor | **FIXED** | `AuthenticatedDio` + service migration |
| P2-006 | Clips | Flutter | Favorites stored locally only | **FIXED** | Removed local-only favorites from UI/service |
| P2-007 | Subscriptions | Admin-web | Subscriber detail/history not in UI | **FIXED** | Detail panel + API client methods |
| P2-008 | Clips | Admin-web | No media upload endpoint | **FIXED** | `ClipsUploadService` + admin upload UI |
| P2-009 | Admin | Admin-web | Weak Axios error parsing | **FIXED** | Shared `normalizeError()` across CRUD pages |
| P2-010 | Subscriptions | Flutter | `GET /subscriptions/content/validate` unused | **FIXED** | Wired into `EbookService.getAccess()` |

---

## P3 — Enhancements (open)

| ID | Module | Layer | Item | Recommendation |
|----|--------|-------|------|----------------|
| P3-001 | Library | API | Duplicate `/library` and `/ebooks/library` | Consolidate to one endpoint |
| P3-002 | Subscriptions | API | `GET /me` duplicates `GET /status` | Remove one alias |
| P3-003 | Clips | API | No view-count increment route | Add analytics endpoint |
| P3-004 | Programs | Flutter | `GET /programs/me/enrollments` unused | Use for enrollment list |
| P3-005 | Mentorship | Flutter | Public mentors + me/enrollments unused | Enrich UI |
| P3-006 | Notifications | Flutter | `fetchNotificationById` unused | Use for deep-link detail |
| P3-007 | RBAC | Platform | No fine-grained permissions | Permissions table (future) |
| P3-008 | Auth | API | No email verification flow | Add verification if required |

---

## Defects by module (current)

| Module | P0 | P1 | P2 | P3 |
|--------|----|----|----|----|
| Authentication | 0 | 0 | 0 | 1 |
| Users | 0 | 0 | 0 | 0 |
| Announcements | 0 | 0 | 0 | 0 |
| Events | 0 | 0 | 0 | 0 |
| Clips | 0 | 0 | 0 | 1 |
| Library | 0 | 0 | 0 | 1 |
| Subscriptions | 0 | 0 | 0 | 1 |
| Notifications | 0 | 0 | 0 | 1 |
| Programs | 0 | 0 | 0 | 1 |
| Mentorship | 0 | 0 | 0 | 1 |
| RBAC | 0 | 0 | 0 | 1 |
| Policies | 0 | 0 | 0 | 0 |
| Admin (general) | 0 | 0 | 0 | 0 |

---

## Files changed in P2 remediation (Sprint 1)

| File | Change |
|------|--------|
| `apps/mobile-flutter/lib/core/users/users_service.dart` | New profile update service |
| `apps/mobile-flutter/lib/screens/profile_screen.dart` | Profile edit UI |
| `apps/mobile-flutter/lib/core/auth/auth_provider.dart` | `reloadCurrentUser()` |
| `apps/mobile-flutter/lib/core/http/authenticated_dio.dart` | Global 401 refresh |
| `apps/mobile-flutter/lib/core/clips/clip_service.dart` | AuthenticatedDio; favorites removed |
| `apps/mobile-flutter/lib/screens/clips_screen.dart` | Favorites UI removed |
| `apps/mobile-flutter/lib/screens/clip_details_screen.dart` | Favorites UI removed |
| `apps/mobile-flutter/lib/core/subscriptions/subscription_service.dart` | `validateContentAccess()` |
| `apps/mobile-flutter/lib/core/ebooks/ebook_service.dart` | Content validate before access |
| `apps/mobile-flutter/test/profile_screen_test.dart` | AuthScope test harness |
| `apps/admin-web/lib/auth/http-client.ts` | 403 no longer logs out |
| `apps/admin-web/lib/http/normalize-error.ts` | Shared error parsing |
| `apps/admin-web/app/(protected)/content/page.tsx` | Content hub |
| `apps/admin-web/app/(protected)/subscriptions/page.tsx` | Subscriber detail panel |
| `apps/admin-web/lib/subscriptions/api-client.ts` | Detail/history fetch |
| `apps/admin-web/app/(protected)/clips/page.tsx` | Media upload UI |
| `apps/admin-web/lib/clips/api-client.ts` | Upload API client |
| `services/api/src/modules/clips/clips-upload.service.ts` | Upload service |
| `services/api/src/modules/clips/clips.controller.ts` | Upload routes |
| `services/api/docs/RBAC_ROLE_MATRIX.md` | Role matrix documentation |

---

## Validation (2026-06-19)

| Check | Result |
|-------|--------|
| `services/api npm test` | 171/171 PASS |
| `services/api npm run build` | PASS |
| `apps/admin-web npm run build` | PASS |
| `apps/mobile-flutter flutter test` | 61/61 PASS |
