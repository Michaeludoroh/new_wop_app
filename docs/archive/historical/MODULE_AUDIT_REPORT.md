# WOP Ministry Platform — Module Audit Report

**Date:** 2026-06-19  
**Scope:** End-to-end audit of 11 platform modules across API, admin-web, and Flutter mobile.

---

## Executive summary

| Layer | Status |
|-------|--------|
| Backend (NestJS + Prisma) | **Strong** — all modules implemented with routes, services, DTOs, and RBAC guards |
| Admin-web | **Good** — 9/11 modules have full admin UI; library is covered via eBooks |
| Flutter mobile | **Good** — consumer flows integrated; Users module not wired |
| Cross-cutting RBAC | **Improved** — mobile role vocabulary and admin eBooks gate aligned in this audit |
| Test suite | **171/171 PASS** after P0/P1 fixes |

**Overall platform readiness:** Suitable for staged beta with known P2/P3 gaps documented below.

---

## Audit methodology

For each module:
1. Verified backend controller routes under `/api/v1`
2. Verified Prisma models in `services/api/prisma/schema.prisma`
3. Verified NestJS services/controllers and DTO validation
4. Verified admin-web API clients and pages
5. Verified Flutter services, screens, and response parsing
6. Verified permissions (`JwtAuthGuard`, `RolesGuard`, `@Roles`)
7. Classified defects in `DEFECT_MATRIX.md`

---

## 1. Authentication

### Backend
| Item | Status |
|------|--------|
| Routes | `POST register/login/logout/refresh/forgot-password/reset-password`, `GET me` |
| Models | `User`, `RefreshToken` |
| Service | `auth.service.ts`, `jwt.strategy.ts` |
| DTOs | All auth DTOs validated (`@IsEmail`, `@MinLength`, etc.) |
| Permissions | Public auth routes + rate limiting; `GET me` requires JWT |
| Responses | `{ user, accessToken, refreshToken }` on login; `fullName` on user |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Login, session bootstrap, token refresh |
| Pages | `app/login/page.tsx` |
| Role gate | Rejects non-admin-portal roles at login |

### Flutter
| Item | Status |
|------|--------|
| Integration | Full auth flow (login, register, forgot/reset password) |
| Files | `auth_service.dart`, `auth_provider.dart`, auth screens |
| **Fixed (P0)** | `AuthUser` now maps `fullName` → `name` |

### Verdict: **PASS**

---

## 2. Users

### Backend
| Item | Status |
|------|--------|
| Routes | `GET /users`, `GET /users/:id`, `PATCH profile/role/status` |
| Models | `User` (+ subscription relation in responses) |
| Service | `users.service.ts` — ownership checks, SUPER_ADMIN role assignment guard |
| DTOs | Query, role, status DTOs validated; **Fixed (P1)** `UpdateUserProfileDto` added |
| Permissions | List/role/status: ADMIN+; profile/self: USER+ with ownership |

### Admin-web
| Item | Status |
|------|--------|
| Integration | List, search, role change, enable/disable |
| Pages | `app/(protected)/users/page.tsx` |
| **Fixed (P1)** | Error handling on role/status mutations |

### Flutter
| Item | Status |
|------|--------|
| Integration | **None** — identity from `/auth/me` only |
| Gap (P2) | No profile edit via `PATCH /users/:id/profile` |

### Verdict: **PASS** (admin); **PARTIAL** (mobile profile)

---

## 3. Announcements

### Backend
| Item | Status |
|------|--------|
| Routes | Public list/detail/categories; admin CRUD + publish/unpublish + image upload |
| Models | `Announcement` |
| Service | `announcements.service.ts`, upload service |
| DTOs | Create/update/query validated; DTO `content` maps to Prisma `body` |
| Permissions | Public read; admin write requires ADMIN/SUPER_ADMIN |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full CRUD, publish, image upload |
| Pages | `app/(protected)/announcements/page.tsx` |

### Flutter
| Item | Status |
|------|--------|
| Integration | Public feed + detail + categories |
| Screens | `announcements_screen.dart`, `announcement_details_screen.dart` |

### Verdict: **PASS**

---

## 4. Events

### Backend
| Item | Status |
|------|--------|
| Routes | Public list/featured/detail; user RSVP; admin CRUD + attendees |
| Models | `Event`, `EventAttendee` |
| Service | `events.service.ts` |
| DTOs | Create/update/query validated |
| Permissions | Public read; RSVP USER+; admin MODERATOR+ (hierarchy) |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full CRUD, publish, attendee viewer |
| Pages | `app/(protected)/events/page.tsx` |

### Flutter
| Item | Status |
|------|--------|
| Integration | Public feed, RSVP, my RSVPs |
| Screens | `events_screen.dart`, `event_details_screen.dart` |

### Verdict: **PASS**

---

## 5. Clips

### Backend
| Item | Status |
|------|--------|
| Routes | Public list/featured/detail; admin CRUD + publish |
| Models | `Clip` |
| Service | `clips.service.ts` |
| DTOs | Create/update/query with `@IsUrl` for media |
| Permissions | Public read; admin MODERATOR+ |
| Gap (P3) | No view-count increment endpoint |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full CRUD + publish |
| Pages | `app/(protected)/clips/page.tsx` |
| Gap (P2) | No media upload — expects external URLs |

### Flutter
| Item | Status |
|------|--------|
| Integration | Public feed + detail |
| Gap (P2) | Favorites local-only; content validate unused |

### Verdict: **PASS**

---

## 6. Library

### Backend
| Item | Status |
|------|--------|
| Routes | `GET /library` (user library); also `GET /ebooks/library` (duplicate) |
| Models | `Ebook`, `EbookPurchase`, `ReadingProgress` |
| Service | Delegates to `EbooksService` — no dedicated library service |
| DTOs | None on library route |
| Permissions | JWT + USER/MODERATOR/ADMIN |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Via eBooks admin module (`/ebooks/admin/*`) |
| **Fixed (P0)** | MODERATOR can access `/ebooks` (middleware + nav aligned) |

### Flutter
| Item | Status |
|------|--------|
| Integration | `GET /library`, ebooks, progress, purchase, stream |
| Screens | `my_library_screen.dart`, `ebook_screen.dart`, reader screens |

### Verdict: **PASS**

---

## 7. Subscriptions

### Backend
| Item | Status |
|------|--------|
| Routes | Plans CRUD, subscribe/cancel/me/status, admin analytics/lifecycle, content validate |
| Models | `SubscriptionPlan`, `UserSubscription`, `SubscriptionStatusHistory` |
| Services | `subscriptions.service.ts`, lifecycle, content-access |
| DTOs | Plan, subscribe, cancel, admin status DTOs validated |
| Permissions | User flows USER+; admin ADMIN+ |
| Gap (P3) | `GET /me` duplicates `GET /status` |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Subscriber list, analytics, lifecycle, status/cancel |
| **Fixed (P1)** | Plan list/create/deactivate added |
| Gap (P2) | Subscriber detail/history endpoints not in UI |

### Flutter
| Item | Status |
|------|--------|
| Integration | Plans, status, subscribe, cancel, Flutterwave checkout |
| Screens | `subscription_screen.dart`, `membership_status_card.dart` |

### Verdict: **PASS**

---

## 8. Notifications

### Backend
| Item | Status |
|------|--------|
| Routes | List, detail, broadcast, targeted, read-state |
| Models | `Notification` |
| Service | `notifications.service.ts` — ownership checks on read-state |
| DTOs | Broadcast, targeted, query, read-state validated |
| Permissions | Read USER+; create ADMIN/SUPER_ADMIN |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full list, broadcast, targeted, realtime socket |
| Pages | `app/(protected)/notifications/page.tsx` |
| Quality | Best error handling in admin app |

### Flutter
| Item | Status |
|------|--------|
| Integration | REST + Socket.IO + FCM push |
| **Fixed (P0)** | Realtime default port aligned to 3000 |
| Gap (P2) | `fetchNotificationById` unused |

### Verdict: **PASS**

---

## 9. Programs

### Backend
| Item | Status |
|------|--------|
| Routes | Public list/featured/detail; user enroll/progress; admin CRUD + analytics |
| Models | `EmpowermentProgram`, `ProgramEnrollment`, `ProgramProgress` |
| Service | `programs.service.ts` |
| DTOs | Create/update/query/progress validated |
| Permissions | Public read; user USER+; admin MODERATOR+ |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full CRUD, analytics, enrollments, progress |
| Pages | `app/(protected)/programs/page.tsx` |

### Flutter
| Item | Status |
|------|--------|
| Integration | Public feed, enroll, progress update |
| Gap (P3) | `GET /programs/me/enrollments` not called |

### Verdict: **PASS**

---

## 10. Mentorship

### Backend
| Item | Status |
|------|--------|
| Routes | Richest module — public, user enroll/progress/attendance/feedback, admin sessions/attendance |
| Models | 6 models (class, session, participant, attendance, feedback, progress) |
| Service | `mentorship.service.ts` |
| DTOs | Full validation including session, attendance, feedback |
| Permissions | Public read; user USER+; admin MODERATOR+ |

### Admin-web
| Item | Status |
|------|--------|
| Integration | Full class/session/attendance/feedback/progress UI |
| Pages | `app/(protected)/mentorship/page.tsx` |

### Flutter
| Item | Status |
|------|--------|
| Integration | Public feed, enroll, progress, attendance, feedback |
| Gap (P3) | Public mentors list and me/enrollments unused |

### Verdict: **PASS**

---

## 11. RBAC

### Backend
| Item | Status |
|------|--------|
| Implementation | `RolesGuard` with hierarchy: USER < MODERATOR < ADMIN < SUPER_ADMIN |
| Models | `User.role` enum only — no permissions table |
| Management | `PATCH /users/:id/role` |
| Inconsistency (P2) | Announcements/subscriptions use ADMIN; events/clips/programs/mentorship use MODERATOR for admin CRUD |

### Admin-web
| Item | Status |
|------|--------|
| Implementation | `middleware.ts` route map, `ProtectedModule`, nav role filtering |
| **Fixed (P0)** | eBooks MODERATOR access aligned across middleware, nav, page |
| Gap (P2) | `ROLE_HIERARCHY` defined but unused; 403 triggers full logout |

### Flutter
| Item | Status |
|------|--------|
| Implementation | Route-level role check in `app_router.dart` |
| **Fixed (P0)** | Backend roles (`USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`) now accepted |

### Verdict: **PASS** (after fixes)

---

## Cross-module observations

| Observation | Severity |
|-------------|----------|
| Admin role inconsistency (ADMIN vs MODERATOR) across content modules | P2 |
| Library duplicates `/library` and `/ebooks/library` | P3 |
| Mobile lacks shared 401 refresh interceptor (except notifications) | P2 |
| Admin `content/page.tsx` is placeholder only | P2 |
| Flutter Users/profile module not integrated | P2 |
| No fine-grained permissions beyond 4 roles | P3 |

---

## Validation results (post-fix)

| Command | Result |
|---------|--------|
| `services/api npm run build` | **PASS** |
| `services/api npm test` | **171/171 PASS** |
| `apps/mobile-flutter flutter test test/core/auth/` | **11/11 PASS** |

---

## Module readiness matrix

| Module | Backend | Admin | Mobile | Overall |
|--------|---------|-------|--------|---------|
| Authentication | ✅ | ✅ | ✅ | **Ready** |
| Users | ✅ | ✅ | ⚠️ | **Ready (admin)** |
| Announcements | ✅ | ✅ | ✅ | **Ready** |
| Events | ✅ | ✅ | ✅ | **Ready** |
| Clips | ✅ | ✅ | ✅ | **Ready** |
| Library | ✅ | ✅ | ✅ | **Ready** |
| Subscriptions | ✅ | ✅ | ✅ | **Ready** |
| Notifications | ✅ | ✅ | ✅ | **Ready** |
| Programs | ✅ | ✅ | ✅ | **Ready** |
| Mentorship | ✅ | ✅ | ✅ | **Ready** |
| RBAC | ✅ | ✅ | ✅ | **Ready** |
