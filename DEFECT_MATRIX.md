# WOPP — Defect Matrix

**Date:** 2026-06-19  
**Classification:** P0 = production blocker · P1 = major defect · P2 = minor defect · P3 = enhancement

---

## Summary

| Priority | Total | Fixed | Open |
|----------|-------|-------|------|
| P0 | 4 | 4 | 0 |
| P1 | 5 | 5 | 0 |
| P2 | 10 | 0 | 10 |
| P3 | 8 | 0 | 8 |

---

## P0 — Production blockers (all fixed)

| ID | Module | Layer | Defect | Impact | Status | Fix |
|----|--------|-------|--------|--------|--------|-----|
| P0-001 | Authentication | Flutter | `AuthUser` parsed `name` but API returns `fullName` | Dashboard shows email instead of user name | **FIXED** | `auth_models.dart` maps `fullName` |
| P0-002 | RBAC | Flutter | Router allowed `admin/member/user` only; blocked `MODERATOR`/`SUPER_ADMIN` | Staff users locked out of all routes | **FIXED** | `app_router.dart` accepts backend role vocabulary |
| P0-003 | Notifications | Flutter | Realtime socket default port 4000 vs REST 3000 | Live notifications broken when env unset | **FIXED** | `realtime_notifications_service.dart` port 3000 |
| P0-004 | RBAC / Library | Admin-web | Middleware/nav blocked MODERATOR from `/ebooks` while backend allows MODERATOR | Moderators cannot manage eBooks | **FIXED** | `middleware.ts`, `nav-links.ts` |

---

## P1 — Major defects (all fixed)

| ID | Module | Layer | Defect | Impact | Status | Fix |
|----|--------|-------|--------|--------|--------|-----|
| P1-001 | Users | API | Profile update used unvalidated `Record<string, unknown>` | Arbitrary fields accepted; no validation pipe | **FIXED** | `UpdateUserProfileDto` + controller/service |
| P1-002 | Policies | API | `policies.service.spec.ts` missing `findMany` mock | Test suite failure (171st test) | **FIXED** | Mock `policyAcceptance.findMany` in accept test |
| P1-003 | Subscriptions | Admin-web | Plan CRUD endpoints existed but no admin UI | Cannot manage plans without API calls | **FIXED** | Plan section on subscriptions page + API client |
| P1-004 | Users | Admin-web | Role/status mutations lacked try/catch | Unhandled errors on admin actions | **FIXED** | Error handling in `users/page.tsx` |
| P1-005 | Subscriptions | Admin-web | Subscriber status/cancel lacked error handling | Silent failures on admin actions | **FIXED** | try/catch in `subscriptions/page.tsx` |

---

## P2 — Minor defects (open)

| ID | Module | Layer | Defect | Impact | Recommendation |
|----|--------|-------|--------|--------|----------------|
| P2-001 | Users | Flutter | No profile service; `/users/:id/profile` unused | Users cannot edit name in app | Add profile screen + service |
| P2-002 | RBAC | Admin-web | 403 on any request triggers full logout | Permission denied logs user out entirely | Distinguish auth vs authorization errors |
| P2-003 | RBAC | Backend | Inconsistent admin role: ADMIN vs MODERATOR across modules | Confusing permission model | Standardize or document role matrix |
| P2-004 | Admin | Admin-web | `content/page.tsx` is placeholder | Misleading nav item | Implement or remove route |
| P2-005 | Auth | Flutter | No global 401 refresh interceptor | Session expiry causes failed requests | Shared HTTP client with refresh |
| P2-006 | Clips | Flutter | Favorites stored locally only | No cross-device sync | Backend favorites or remove feature |
| P2-007 | Subscriptions | Admin-web | Subscriber detail/history not in UI | Limited admin visibility | Add detail drawer |
| P2-008 | Clips | Admin-web | No media upload endpoint | Manual URL entry only | Add upload like announcements |
| P2-009 | Admin | Admin-web | Weak Axios error parsing on most CRUD pages | Generic error messages | Adopt notifications `normalizeError` pattern |
| P2-010 | Subscriptions | Flutter | `GET /subscriptions/content/validate` unused | Gated content not validated client-side | Wire into premium clip/ebook flows |

---

## P3 — Enhancements (open)

| ID | Module | Layer | Defect | Recommendation |
|----|--------|-------|--------|----------------|
| P3-001 | Library | API | Duplicate `/library` and `/ebooks/library` | Consolidate to one endpoint |
| P3-002 | Subscriptions | API | `GET /me` duplicates `GET /status` | Remove one alias |
| P3-003 | Clips | API | No view-count increment route | Add analytics endpoint |
| P3-004 | Programs | Flutter | `GET /programs/me/enrollments` unused | Use for enrollment list |
| P3-005 | Mentorship | Flutter | Public mentors + me/enrollments unused | Enrich UI |
| P3-006 | Notifications | Flutter | `fetchNotificationById` unused | Use for deep-link detail |
| P3-007 | RBAC | Platform | No fine-grained permissions | Permissions table (future) |
| P3-008 | Auth | API | No email verification flow | Add verification if required |

---

## Defects by module

| Module | P0 | P1 | P2 | P3 |
|--------|----|----|----|----|
| Authentication | 1 | 0 | 1 | 1 |
| Users | 0 | 2 | 1 | 0 |
| Announcements | 0 | 0 | 0 | 0 |
| Events | 0 | 0 | 0 | 0 |
| Clips | 0 | 0 | 2 | 1 |
| Library | 1 | 0 | 0 | 1 |
| Subscriptions | 0 | 2 | 2 | 1 |
| Notifications | 1 | 0 | 0 | 1 |
| Programs | 0 | 0 | 0 | 1 |
| Mentorship | 0 | 0 | 0 | 1 |
| RBAC | 1 | 0 | 2 | 1 |
| Policies (test) | 0 | 1 | 0 | 0 |
| Admin (general) | 0 | 0 | 2 | 0 |

---

## Files changed in P0/P1 remediation

| File | Change |
|------|--------|
| `apps/mobile-flutter/lib/core/auth/models/auth_models.dart` | fullName mapping |
| `apps/mobile-flutter/lib/core/router/app_router.dart` | RBAC role vocabulary |
| `apps/mobile-flutter/lib/core/notifications/services/realtime_notifications_service.dart` | Port default |
| `apps/admin-web/middleware.ts` | MODERATOR on /ebooks |
| `apps/admin-web/components/nav-links.ts` | MODERATOR on eBooks nav |
| `services/api/src/modules/users/dto/update-user-profile.dto.ts` | New DTO |
| `services/api/src/modules/users/users.controller.ts` | Use DTO |
| `services/api/src/modules/users/users.service.ts` | Validated update |
| `services/api/src/modules/policies/policies.service.spec.ts` | Mock fix |
| `apps/admin-web/lib/subscriptions/api-client.ts` | Plan CRUD |
| `apps/admin-web/lib/subscriptions/types.ts` | Plan types |
| `apps/admin-web/app/(protected)/subscriptions/page.tsx` | Plan UI + errors |
| `apps/admin-web/app/(protected)/users/page.tsx` | Error handling |
