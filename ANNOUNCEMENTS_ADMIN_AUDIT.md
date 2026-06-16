# Announcements & Admin Dashboard Audit

**Date:** June 11, 2026  
**Scope:** Read-only audit of Announcements and Admin Dashboard implementations across backend, admin web, mobile, notifications, and tests.  
**Constraint:** No source files were modified during this audit.

---

## Executive Summary

| Module | Classification | Estimated Completion |
|--------|----------------|----------------------|
| **Announcements** | **Mostly implemented** (backend + publish flow solid; admin CRUD and mobile UX incomplete) | **~68%** |
| **Admin Dashboard** | **Partially implemented** (home is a link hub; analytics page exists but API/UI contract is broken; cross-module stats not aggregated) | **~38%** |

### Overall Completion Scores

| Module | Score | Remaining Effort |
|--------|-------|------------------|
| Announcements | **68%** | **~32%** |
| Admin Dashboard | **38%** | **~62%** |

---

# Part 1 — Announcements Module

## Classification by Area

| # | Area | Classification | Completion % |
|---|------|----------------|--------------|
| 1 | Prisma models | **Fully implemented** | **95%** |
| 2 | Controllers/routes | **Fully implemented** | **95%** |
| 3 | Services/business logic | **Mostly implemented** | **72%** |
| 4 | Admin web pages | **Partially implemented** | **45%** |
| 5 | Mobile screens | **Missing** (indirect via notifications only) | **15%** |
| 6 | Notification integration | **Fully implemented** | **90%** |
| 7 | Publish/unpublish workflow | **Mostly implemented** | **70%** |
| 8 | Tests | **Partially implemented** | **55%** |
| | **Overall** | **Mostly implemented** | **~68%** |

---

## 1. Prisma Models

**Classification:** Fully implemented

### Files involved

| File | Role |
|------|------|
| `services/api/prisma/schema.prisma` | `Announcement` model (lines 207–230), `AnnouncementCategory` enum |
| `services/api/tmp-hardening/announcements-category-enum-migration.sql` | Category enum migration artifact |
| `services/api/tmp-hardening/announcements-phase1-migration.sql` | Phase-1 migration artifact |

### Model: `Announcement`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `title` / `body` | String | Core content |
| `imageUrl` | String? | Defined in schema; **not persisted by service** |
| `category` | `AnnouncementCategory` | Default `GENERAL_UPDATE`; **not persisted by service** |
| `status` | `ContentStatus` | DRAFT / PUBLISHED / ARCHIVED — used as source of truth |
| `isPublished` | Boolean | Schema field; **service derives publish state from `status` only** |
| `pushNotificationSent` | Boolean | Set by notification delivery pipeline |
| `publishedAt` | DateTime? | Set on publish |
| `adminUserId` | String | FK → `User` (`AnnouncementAuthor`) |
| `deletedAt` | DateTime? | Soft delete |
| Relations | `Notification[]`, `PushDeliveryLog[]` | Wired for delivery tracking |

**Indexes:** `status`, `isPublished`, `category`, `adminUserId`, `deletedAt`

### Gap

Schema is richer than service usage: `category`, `imageUrl`, and `isPublished` exist in DB but create/update paths in `announcements.service.ts` only write `title`, `body`, `status`, `publishedAt`, and `adminUserId`.

---

## 2. Controllers / Routes

**Classification:** Fully implemented

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/announcements/announcements.controller.ts` | HTTP routes |
| `services/api/src/modules/announcements/announcements.module.ts` | NestJS module |
| `services/api/src/app.module.ts` | Registers `AnnouncementsModule` |
| `services/api/src/main.ts` | Global prefix `/api/v1` |

### Route inventory

| Method | Route | Auth / RBAC | Behavior |
|--------|-------|-------------|----------|
| `GET` | `/api/v1/announcements/public` | Public | Paginated published list (Prisma) |
| `GET` | `/api/v1/announcements/public/:id` | Public | Single published item |
| `GET` | `/api/v1/announcements/admin` | JWT + `ADMIN`, `SUPER_ADMIN` | Admin list with status/search filters |
| `GET` | `/api/v1/announcements/admin/:id` | JWT + `ADMIN`, `SUPER_ADMIN` | Admin detail |
| `POST` | `/api/v1/announcements/admin` | JWT + `ADMIN`, `SUPER_ADMIN` | Create (optional immediate publish) |
| `PATCH` | `/api/v1/announcements/admin/:id` | JWT + `ADMIN`, `SUPER_ADMIN` | Update |
| `PATCH` | `/api/v1/announcements/admin/:id/publish` | JWT + `ADMIN`, `SUPER_ADMIN` | Publish + notify |
| `PATCH` | `/api/v1/announcements/admin/:id/unpublish` | JWT + `ADMIN`, `SUPER_ADMIN` | Unpublish |
| `DELETE` | `/api/v1/announcements/admin/:id` | JWT + `ADMIN`, `SUPER_ADMIN` | Soft delete |

Public routes are intentionally unguarded; all admin routes are JWT + role-scoped per `route-security.spec.ts`.

---

## 3. Services / Business Logic

**Classification:** Mostly implemented

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/announcements/announcements.service.ts` | CRUD, publish/unpublish, audit logs, notification trigger |
| `services/api/src/modules/announcements/dto/create-announcement.dto.ts` | Create validation (title, content, imageUrl, category, isPublished) |
| `services/api/src/modules/announcements/dto/update-announcement.dto.ts` | Update validation |
| `services/api/src/modules/announcements/dto/announcement-query.dto.ts` | Pagination, search, status, category filters |
| `services/api/src/modules/announcements/dto/announcement-category.constants.ts` | Allowed categories |

### What works (real data)

- Public and admin list/detail queries against Prisma with soft-delete filtering
- Create with draft vs immediate publish (`isPublished` flag on DTO)
- Update with optional publish transition (triggers notification on first publish)
- Dedicated `publish` / `unpublish` / soft `remove` with audit log entries
- Response mapping (`content` alias for `body`, `isPublished` derived from `status`)
- On publish: calls `NotificationsService.deliverPublishedAnnouncement()`

### Gaps

| Gap | Evidence |
|-----|----------|
| `category` not saved on create/update | `create()` only sets `title`, `body`, `status`, `publishedAt`, `adminUserId` |
| `imageUrl` not saved on create/update | Same create/update data blocks |
| `category` / `imageUrl` not returned in `toResponse()` | Admin UI category pill always falls back to `GENERAL_UPDATE` |
| `isPublished` DB column not synced | Service uses `ContentStatus` only |
| No ARCHIVED workflow | DTO/types mention ARCHIVED; service only toggles DRAFT ↔ PUBLISHED |
| Category filter on admin list unused in practice | Query DTO supports `category`; service `listAdmin` does not apply it |

---

## 4. Admin Web Pages

**Classification:** Partially implemented

### Files involved

| File | Role |
|------|------|
| `apps/admin-web/app/(protected)/announcements/page.tsx` | Announcements admin UI |
| `apps/admin-web/lib/announcements/api-client.ts` | HTTP client (`getFeed`, `publish` only) |
| `apps/admin-web/lib/announcements/hooks.ts` | `useAnnouncementsFeed`, `usePublishAnnouncement` |
| `apps/admin-web/lib/announcements/types.ts` | TS types |
| `apps/admin-web/components/protected-module.tsx` | Client RBAC gate |
| `apps/admin-web/components/nav-links.ts` | Nav entry (ADMIN, SUPER_ADMIN) |
| `apps/admin-web/middleware.ts` | Route-level RBAC for `/announcements` |

### Admin pages used

| Route | Status | Notes |
|-------|--------|-------|
| `/announcements` | **Functional (partial)** | Publish form + published feed; real API |

### Implemented UI

- Publish form: title, body, category selector, submit → `POST /announcements/admin`
- Published feed: `GET /announcements/admin?status=PUBLISHED&limit=20`
- Client validation, loading/error states, refresh button
- RBAC: `ProtectedModule` + middleware restrict to `SUPER_ADMIN`, `ADMIN`

### Missing admin UI

- Edit existing announcement
- Delete / unpublish actions
- Draft list and draft-first workflow
- Image upload / `imageUrl` field
- Pagination controls
- Detail view (`GET /admin/:id`)
- Category persistence reflected in feed (backend gap)

---

## 5. Mobile Screens

**Classification:** Missing (dedicated module); indirect delivery via notifications

### Files involved

| File | Role |
|------|------|
| `apps/mobile-flutter/lib/screens/notifications_screen.dart` | In-app notification list (includes announcement-derived items) |
| `apps/mobile-flutter/lib/core/notifications/services/notifications_service.dart` | `GET /notifications` API |
| `apps/mobile-flutter/lib/core/notifications/services/realtime_notifications_service.dart` | Listens for `announcement.published` socket event |
| `apps/mobile-flutter/lib/core/notifications/providers/notifications_provider.dart` | State + pagination + mark read |
| `apps/mobile-flutter/TODO.md` | **Outdated** — still lists announcements as incomplete |

### Mobile pages used

| Screen | Route | Status |
|--------|-------|--------|
| Notifications | `/notifications` | **Functional** — real API + realtime |
| Announcements list | — | **Missing** |
| Announcement details | — | **Missing** |

No `lib/core/announcements/` module, no calls to `GET /announcements/public`.

---

## 6. Notification Integration

**Classification:** Fully implemented

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/notifications/notifications.service.ts` | `deliverPublishedAnnouncement()` |
| `services/api/src/modules/notifications/notifications.service.spec.ts` | Delivery + dedupe tests |
| Realtime gateway (via `RealtimeService`) | Emits `announcement.published`, `notification.created` |
| Push service | Broadcast with dedupe key `announcement.published:{id}` |

### Pipeline

1. On publish (create with `isPublished: true`, update transition, or `PATCH .../publish`):
2. Create in-app `Notification` (broadcast, `userId: null`, linked via `announcementId`)
3. Emit realtime events to connected clients
4. Send push broadcast (skipped if `pushNotificationSent` already true)
5. Mark `pushNotificationSent: true` on announcement

Mobile `RealtimeNotificationsService` maps `announcement.published` into the same handlers as `notification.created` / `notification.updated`.

---

## 7. Publish / Unpublish Workflow

**Classification:** Mostly implemented

| Layer | Publish | Unpublish | Draft |
|-------|---------|-----------|-------|
| Backend API | ✅ `POST` with `isPublished`, `PATCH .../publish`, update transition | ✅ `PATCH .../unpublish` | ✅ Default on create without `isPublished` |
| Notification on publish | ✅ Idempotent delivery | N/A | N/A |
| Admin UI | ✅ Publish-on-create only | ❌ Not exposed | ❌ No draft management |
| Mobile | ✅ Via notification feed | N/A | N/A |

---

## 8. Tests

**Classification:** Partially implemented

### Files involved

| File | Coverage |
|------|----------|
| `services/api/src/modules/announcements/announcements.service.spec.ts` | Notification delivery on create/publish; draft update skip |
| `services/api/src/modules/announcements/announcements.validation.spec.ts` | DTO hardening (title/content type, invalid category) |
| `services/api/src/modules/notifications/notifications.service.spec.ts` | Announcement delivery + dedupe |
| `services/api/src/security/route-security.spec.ts` | RBAC on all admin announcement methods |

### Missing tests

- Controller/integration/e2e tests for full CRUD routes
- Tests for category/imageUrl persistence
- Admin web tests (none found)
- Mobile announcement/notification widget tests specific to announcement payloads
- Unpublish and soft-delete behavior tests

---

## Announcements — Screens & API Summary

### Functional screens

| Platform | Screen | Connected API |
|----------|--------|---------------|
| Admin web | `/announcements` | `GET/POST /announcements/admin` |
| Mobile | `/notifications` | `GET /notifications` + realtime |

### Placeholder / missing screens

| Platform | Screen | Status |
|----------|--------|--------|
| Mobile | Announcements list | **Missing** |
| Mobile | Announcement detail | **Missing** |
| Admin web | Draft management, edit, delete | **Missing** |

### APIs — real data vs stub

| API | Data source | Notes |
|-----|-------------|-------|
| `GET /announcements/public` | **Real (Prisma)** | Not consumed by mobile yet |
| `GET /announcements/public/:id` | **Real (Prisma)** | Not consumed by mobile yet |
| `GET /announcements/admin` | **Real (Prisma)** | Used by admin feed |
| `POST /announcements/admin` | **Real (Prisma)** | Category/imageUrl accepted but dropped |
| `PATCH /announcements/admin/:id` | **Real (Prisma)** | Not wired in admin UI |
| `PATCH .../publish`, `.../unpublish` | **Real (Prisma)** | Not wired in admin UI |
| `DELETE /announcements/admin/:id` | **Real (Prisma)** | Not wired in admin UI |
| Notification delivery | **Real** | In-app + push + socket |

### Missing functionality (Announcements)

1. Persist and return `category` and `imageUrl`
2. Sync or remove redundant `isPublished` column
3. Mobile announcements module (list, detail, search, share, deeplink)
4. Admin CRUD UI (edit, delete, unpublish, drafts, pagination)
5. Category filter on admin/public lists
6. ARCHIVED status workflow
7. Update outdated `apps/mobile-flutter/TODO.md`

---

# Part 2 — Admin Dashboard Module

## Classification by Area

| # | Area | Classification | Completion % |
|---|------|----------------|--------------|
| 1 | Dashboard page implementation | **Placeholder/scaffold only** | **15%** |
| 2 | Analytics widgets | **Partially implemented** | **35%** |
| 3 | User statistics | **Partially implemented** | **40%** |
| 4 | Subscription statistics | **Partially implemented** | **45%** |
| 5 | eBook statistics | **Partially implemented** | **30%** |
| 6 | Events statistics | **Missing** (central dashboard) | **5%** |
| 7 | Programs statistics | **Partially implemented** (module-only) | **25%** |
| 8 | Mentorship statistics | **Partially implemented** (module-only) | **25%** |
| 9 | Notifications statistics | **Partially implemented** | **35%** |
| 10 | RBAC integration | **Mostly implemented** | **85%** |
| 11 | Tests | **Partially implemented** (RBAC only) | **15%** |
| | **Overall** | **Partially implemented** | **~38%** |

---

## 1. Dashboard Page Implementation

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `apps/admin-web/app/(protected)/page.tsx` | Home / “Ministry Admin Dashboard” |
| `apps/admin-web/components/nav-links.ts` | Module link definitions |

### What exists

- Title, description, and a responsive grid of links to all admin modules
- No KPI cards, charts, date filters, or aggregated metrics on the home page

### What's missing

- Unified dashboard layout with at-a-glance metrics
- Cross-module summary widgets
- Recent activity feed
- Quick actions beyond navigation

---

## 2. Analytics Widgets

**Classification:** Partially implemented

### Files involved

| File | Role |
|------|------|
| `apps/admin-web/app/(protected)/analytics/page.tsx` | Analytics dashboard UI |
| `apps/admin-web/lib/analytics/hooks.ts` | Data hooks + realtime refresh listener |
| `apps/admin-web/lib/analytics/api-client.ts` | Calls `/analytics/*` |
| `apps/admin-web/lib/analytics/types.ts` | Expected response shapes |
| `services/api/src/modules/analytics/analytics.service.ts` | Backend aggregation |
| `services/api/src/modules/analytics/analytics.controller.ts` | RBAC-protected routes |

### Widget sections on `/analytics`

| Section | UI present | Data likely works |
|---------|------------|-------------------|
| Engagement (total/new users) | ✅ | ❌ API shape mismatch |
| Notification metrics | ✅ | ❌ API shape mismatch |
| Payment metrics | ✅ | ❌ API shape mismatch |
| Subscription metrics | ✅ | ❌ API shape mismatch |
| Operational health (webhooks, recovery) | ✅ | ❌ API shape mismatch |
| Payment report table | ✅ | ❌ API shape mismatch |

### Critical API / UI contract mismatch

**Admin UI expects** (from `lib/analytics/types.ts`):

```typescript
// GET /analytics/summary → { data: { engagement, notifications, payments, subscriptions, operational } }
// GET /analytics/operational → { data: { webhook, paymentRecovery } }
// GET /analytics/report → { data: T[], total, limit, offset }
```

**Backend actually returns** (from `analytics.service.ts`):

```typescript
// GET /analytics/summary → { period, users, payments, subscriptions, ebooks }
// GET /analytics/operational → { period, notifications, realtime: { activeConnections: 0 } }
// GET /analytics/report → { period, payments[], subscriptions[], purchases[] }  // ignores `report` param
```

**Hook bug:** `useAnalyticsSummary` does `setData(response.data)`, but the backend response has no `data` wrapper — hooks receive `undefined` for all widget fields even when the HTTP call succeeds.

**Stubbed backend values:**

- `realtimeConnections` hardcoded to `0` with TODO comment
- Service contains TODOs to “restore richer summary calculations”

---

## 3–9. Statistics by Domain

### User statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /analytics/summary` | Partial | Returns raw `users` count only; no `newUsers`, no engagement grouping |
| Admin `/analytics` UI | Broken binding | Expects `summary.engagement.totalUsers` / `newUsers` |

### Subscription statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /analytics/summary` | Partial | Returns `pending/active/grace/cancelled/expired`; UI expects `trialing/pastDue/conversionRate` |
| `GET /subscriptions/admin/analytics` | **Real (Prisma)** | Rich MRR, grace, expiring-soon — **not wired to dashboard** |

### eBook statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /analytics/summary` | Partial | `{ ebooks: { total, purchases } }` — not displayed on analytics page |
| `GET /ebooks/admin/analytics` | **Real (Prisma)** | Module-specific — **not wired to dashboard** |

### Events statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| Central analytics | **Missing** | No events counts in `AnalyticsService` |
| Events module | Partial | RSVP counts on individual events only (`_count.attendees`) |

### Programs statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /programs/admin/analytics` | **Real (Prisma)** | total/published/featured enrollments, avg completion |
| Central dashboard | **Missing** | Not aggregated on home or `/analytics` |

### Mentorship statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /mentorship/admin/analytics` | **Real (Prisma)** | Class/session/participant aggregates |
| Central dashboard | **Missing** | Not aggregated on home or `/analytics` |

### Notifications statistics

| Source | Classification | Notes |
|--------|----------------|-------|
| `GET /analytics/operational` | Partial | `notifications.total`, `notifications.unread` only |
| Admin `/analytics` UI | Broken binding | Expects read count, read rate, webhook metrics |
| `GET /notifications` (admin page) | **Real** | Feed on `/notifications` page, not dashboard stats |

---

## 10. RBAC Integration

**Classification:** Mostly implemented

### Admin web

| Mechanism | Coverage |
|-----------|----------|
| `apps/admin-web/middleware.ts` | Cookie session + `ROLE_ROUTE_MAP` — `/analytics` and `/announcements` restricted to `SUPER_ADMIN`, `ADMIN` |
| `ProtectedModule` / `AuthGate` | Client-side role check on `/analytics`, `/announcements` |
| `nav-links.ts` | Dashboard visible to all admin roles; Analytics/Announcements ADMIN+ only |

### Backend

| Controller | Roles |
|------------|-------|
| `AnalyticsController` | `SUPER_ADMIN`, `ADMIN` on all methods |
| `AnnouncementsController` (admin routes) | `ADMIN`, `SUPER_ADMIN` |

Verified in `services/api/src/security/route-security.spec.ts`.

### Gap

Home page (`/`) has no role-based module filtering — all links render; middleware redirects unauthorized deep links to `/`.

---

## 11. Tests

**Classification:** Partially implemented

| Area | Tests found | Gap |
|------|-------------|-----|
| Analytics RBAC | `route-security.spec.ts` | No `analytics.service.spec.ts` |
| Analytics calculations | None | No unit tests for aggregations |
| Admin analytics hooks/UI | None | No admin-web tests |
| Module analytics | `programs.service.spec.ts`, `mentorship.service.spec.ts`, `subscriptions.service.spec.ts` | Exist per-module, not dashboard-integrated |

---

## Admin Dashboard — Screens & API Summary

### Functional screens

| Screen | Status | Notes |
|--------|--------|-------|
| `/` (home) | **Placeholder** | Link grid only; navigates to real modules |
| `/analytics` | **Partially functional** | UI renders; metric widgets likely show empty/undefined due to contract mismatch |
| `/notifications` | **Functional** | Separate module; not part of dashboard aggregation |
| `/programs`, `/mentorship`, `/subscriptions`, `/ebooks` | **Functional module pages** | Each has own data; stats not on central dashboard |

### Placeholder screens

| Screen | Status |
|--------|--------|
| `/` home dashboard | **Placeholder** — no widgets or stats |

### APIs — real data vs stub / mismatch

| API | Data | Dashboard use |
|-----|------|---------------|
| `GET /analytics/summary` | **Real Prisma counts** | ❌ Wrong response shape for UI |
| `GET /analytics/operational` | **Real partial** + stub `activeConnections: 0` | ❌ Wrong response shape for UI |
| `GET /analytics/report?report=payments` | **Real rows** but ignores `report` param | ❌ UI expects `{ data[], total }`; gets `{ payments[], subscriptions[], purchases[] }` |
| `GET /subscriptions/admin/analytics` | **Real** | Not on dashboard |
| `GET /programs/admin/analytics` | **Real** | Not on dashboard |
| `GET /mentorship/admin/analytics` | **Real** | Not on dashboard |
| `GET /ebooks/admin/analytics` | **Real** | Not on dashboard |
| Events analytics endpoint | **Missing** | N/A |

### Missing functionality (Admin Dashboard)

1. Home page KPI widgets and cross-module summary
2. Fix analytics API ↔ admin UI contract (response wrapper + field names)
3. Implement `report` query branching on backend
4. Restore operational metrics (webhooks, payment recovery, read rates)
5. Aggregate programs, mentorship, events, ebooks into central analytics
6. Wire realtime connection count (currently hardcoded `0`)
7. Add `analytics.service.spec.ts` and admin UI tests
8. Date-range filtering that affects all widget sections consistently

---

# Validation Evidence

| Check | Result | Evidence |
|-------|--------|----------|
| Announcement Prisma model | ✅ Complete schema | `schema.prisma` lines 207–230 |
| Announcement routes registered | ✅ 9 routes | `announcements.controller.ts` |
| RBAC on admin announcement routes | ✅ Tested | `route-security.spec.ts` lines 99–102 |
| Notification delivery on publish | ✅ Tested | `announcements.service.spec.ts`, `notifications.service.spec.ts` |
| DTO validation hardening | ✅ Tested | `announcements.validation.spec.ts` |
| Admin publish UI → API | ✅ Wired | `announcements/page.tsx`, `lib/announcements/api-client.ts` |
| Category persisted end-to-end | ❌ Gap | Service create/update omit `category`; `toResponse` omits it |
| Analytics UI → API contract | ❌ Broken | Shape mismatch between `analytics.service.ts` and `lib/analytics/types.ts` |
| Mobile announcements module | ❌ Missing | No `announcements_screen.dart`; `TODO.md` outdated |
| Mobile receives published announcements | ✅ Via notifications | `realtime_notifications_service.dart` `announcement.published` handler |
| Module-level analytics endpoints | ✅ Real data | Programs, mentorship, subscriptions, ebooks controllers |
| Central dashboard aggregation | ❌ Missing | Home page is links only; `/analytics` not integrated with module endpoints |

---

# Recommendations

## Implement next

### Announcements (priority order)

1. **Fix service persistence** — save/return `category` and `imageUrl` in create/update/`toResponse`
2. **Mobile announcements module** — list + detail screens consuming `GET /announcements/public`
3. **Admin CRUD UI** — edit, unpublish, delete, draft list, pagination
4. **Align `isPublished` column** with `status` or remove redundancy

### Admin Dashboard (priority order)

1. **Fix analytics API contract** — align backend response with `lib/analytics/types.ts` OR adapt hooks/UI to actual backend shape
2. **Repair analytics hooks** — stop reading nonexistent `response.data` wrapper
3. **Home dashboard KPIs** — aggregate top metrics from analytics + module endpoints
4. **Central cross-module stats** — programs, mentorship, events, ebooks, notifications on one view
5. **Analytics service tests** — unit tests for all aggregation paths

## Improve existing implementation

| Module | Improvement |
|--------|-------------|
| Announcements | Expose unpublish/delete in admin UI; category filter on lists; ARCHIVED workflow |
| Announcements | Expand tests: controller integration, unpublish, soft-delete, category persistence |
| Admin Dashboard | Implement `report` param handling; restore webhook/recovery metrics; realtime connection count |
| Admin Dashboard | Realtime refresh on `/analytics` already listens for `analytics.refresh` — ensure backend emits it |
| Mobile | Deeplink from notification → announcement detail; update `TODO.md` |

## Already production-ready

| Component | Notes |
|-----------|-------|
| Announcement backend CRUD + publish/unpublish API | Real Prisma, audit logs, RBAC |
| Announcement notification pipeline | In-app + push + realtime with dedupe |
| Announcement RBAC + DTO validation | Route security + validation specs |
| Module-level analytics (programs, mentorship, subscriptions, ebooks) | Real Prisma aggregations on dedicated endpoints |
| Admin middleware + ProtectedModule RBAC | Cookie + role map for sensitive routes |
| Mobile notifications screen | Functional list with API + socket updates |

---

# File Index

## Announcements

```
services/api/prisma/schema.prisma
services/api/src/modules/announcements/
  announcements.controller.ts
  announcements.service.ts
  announcements.module.ts
  announcements.service.spec.ts
  announcements.validation.spec.ts
  dto/
apps/admin-web/app/(protected)/announcements/page.tsx
apps/admin-web/lib/announcements/
apps/mobile-flutter/lib/core/notifications/
apps/mobile-flutter/lib/screens/notifications_screen.dart
apps/mobile-flutter/TODO.md
services/api/src/modules/notifications/notifications.service.ts
services/api/src/security/route-security.spec.ts
```

## Admin Dashboard

```
apps/admin-web/app/(protected)/page.tsx
apps/admin-web/app/(protected)/analytics/page.tsx
apps/admin-web/lib/analytics/
apps/admin-web/components/nav-links.ts
apps/admin-web/middleware.ts
apps/admin-web/components/protected-module.tsx
apps/admin-web/components/auth-gate.tsx
services/api/src/modules/analytics/
services/api/src/modules/programs/programs.controller.ts  (adminAnalytics)
services/api/src/modules/mentorship/mentorship.controller.ts  (adminAnalytics)
services/api/src/modules/subscriptions/subscriptions.controller.ts  (getAdminAnalytics)
services/api/src/modules/ebooks/ebooks.controller.ts  (admin/analytics)
services/api/src/security/route-security.spec.ts
```

---

*End of audit.*
