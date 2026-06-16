# Programs & Mentorship Module Audit

**Date:** June 11, 2026  
**Scope:** Read-only audit of current Programs (Empowerment Programs) and Mentorship implementations across backend, admin web, mobile, and tests.  
**Reference modules for comparison:** Events, Clips, eBooks (production-complete patterns).

---

## Executive Summary

| Module | Classification | Estimated Completion |
|--------|----------------|----------------------|
| **Programs** | **Partially implemented** (schema + API shell); admin/mobile **missing** | **~10%** |
| **Mentorship** | **Partially implemented** (schema + participant model + API shell); admin/mobile **missing** | **~12%** |

Both modules are **Phase 2** items per `docs/architecture.md`. They share the same scaffold pattern as each other: Prisma models exist, NestJS modules are wired with RBAC, but services return hardcoded stub JSON with **no database access**. Admin pages are placeholder shells. Mobile has **zero** implementation.

---

# Programs Module

## Classification by Area

| Area | Classification | Completion % |
|------|----------------|--------------|
| 1. Prisma models | **Partially implemented** | **20%** |
| 2. Controllers/routes | **Placeholder/scaffold only** | **10%** |
| 3. Services/business logic | **Placeholder/scaffold only** | **5%** |
| 4. Admin web pages | **Placeholder/scaffold only** | **5%** |
| 5. Mobile screens | **Missing** | **0%** |
| 6. Tests | **Partially implemented** (RBAC metadata only) | **10%** |
| **Overall** | **Partially implemented** | **~10%** |

---

## 1. Prisma Models

**Classification:** Partially implemented

### Files involved

| File | Role |
|------|------|
| `services/api/prisma/schema.prisma` | `EmpowermentProgram` model (lines 376–392) |
| `services/api/prisma/migrations/20260521211453_auth_schema_sync/migration.sql` | Original `Program` table |
| `services/api/prisma/migrations/20260523001204_sync_auth_schema/migration.sql` | Renamed to `EmpowermentProgram`; added `createdById`, `deletedAt`, indexes, User FK |
| `services/api/src/prisma/seed.ts` | No program seed data |

### What exists

**Model:** `EmpowermentProgram`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `title` | String | Required |
| `description` | String? | Optional |
| `status` | `ContentStatus` | DRAFT / PUBLISHED / ARCHIVED |
| `startsAt` / `endsAt` | DateTime? | Schedule window |
| `createdById` | String? | FK → `User` (`ProgramCreator`) |
| `createdAt` / `updatedAt` | DateTime | Timestamps |
| `deletedAt` | DateTime? | Soft delete support |

**Indexes:** `status`, `createdById`, `deletedAt`

### What's missing

Per `docs/architecture.md` Phase 2 vision:

- Courses
- Lessons
- Enrollments
- Progress tracking
- Certificates / live sessions
- Participant or attendance records

No related models (`ProgramEnrollment`, `ProgramProgress`, `ProgramSession`, etc.) exist in schema.

---

## 2. Controllers / Routes

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/programs/programs.controller.ts` | HTTP routes + JWT/RBAC guards |
| `services/api/src/modules/programs/programs.module.ts` | NestJS module registration |
| `services/api/src/app.module.ts` | Imports `ProgramsModule` |
| `services/api/src/main.ts` | Global prefix `/api/v1` |

### Route list

| Method | Route | Roles | Behavior |
|--------|-------|-------|----------|
| `GET` | `/api/v1/programs` | ADMIN, USER, MODERATOR | Stub: `{ module: 'programs', data: [] }` |
| `GET` | `/api/v1/programs/:id` | ADMIN, USER, MODERATOR | Stub: `{ module: 'programs', id }` |
| `POST` | `/api/v1/programs` | MODERATOR | Stub: echoes payload, `{ created: true }` |

### What's missing

- Public vs admin route split (Events/Clips pattern: `/programs/public`, `/programs/admin`)
- `PATCH`, `DELETE`, publish/unpublish endpoints
- `GET /programs/:id/progress` (referenced in admin placeholder but **not implemented**)
- Enrollment, course, session sub-routes
- DTOs and `ValidationPipe` validation
- Pagination, search, category filters
- No `dto/` folder

---

## 3. Services / Business Logic

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/programs/programs.service.ts` | Stub service — **no PrismaService injection** |

### Working functionality

None beyond returning static JSON:

```typescript
findAll()  → { module: 'programs', data: [] }
findOne(id) → { module: 'programs', id }
create(payload) → { module: 'programs', created: true, payload }
```

### Missing functionality

- Prisma CRUD against `EmpowermentProgram`
- Content status enforcement (PUBLISHED + `deletedAt: null` on public reads)
- Soft delete / archive lifecycle
- Creator attribution (`createdById`)
- Enrollment and progress business logic
- Notifications on enrollment/completion
- Integration with analytics

---

## 4. Admin Web Pages

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `apps/admin-web/app/(protected)/programs/page.tsx` | Placeholder page using `ModulePage` |
| `apps/admin-web/components/module-page.tsx` | Generic dashed-box placeholder UI |
| `apps/admin-web/components/protected-module.tsx` | Client-side role gate |
| `apps/admin-web/components/nav-links.ts` | Nav entry → `/programs` |
| `apps/admin-web/middleware.ts` | Route RBAC for SUPER_ADMIN, ADMIN, MODERATOR |

### Missing

| Expected path | Status |
|---------------|--------|
| `apps/admin-web/lib/programs/api-client.ts` | **Missing** |
| `apps/admin-web/lib/programs/types.ts` | **Missing** |
| CRUD forms, list table, search/filter | **Missing** |
| Progress/participation dashboard | **Missing** |
| API integration | **Missing** (page does not call backend) |

Admin placeholder references endpoints not yet built:

```
GET /programs, POST /programs, GET /programs/:id/progress
```

---

## 5. Mobile Screens

**Classification:** Missing

### Files involved

None. Searched `apps/mobile-flutter` — zero program-related files.

### Missing

| Expected | Status |
|----------|--------|
| `lib/core/programs/` (service, models) | **Missing** |
| `screens/programs_screen.dart` | **Missing** |
| `screens/program_details_screen.dart` | **Missing** |
| Router entries in `app_router.dart` | **Missing** |
| Dashboard tab/navigation | **Missing** |

Mobile dashboard tabs today: Dashboard, Events, Clips, Library, Subscription — no Programs.

---

## 6. Tests

**Classification:** Partially implemented

### Files involved

| File | Coverage |
|------|----------|
| `services/api/src/security/route-security.spec.ts` | `ProgramsController` listed; `create` requires MODERATOR |
| `services/api/scripts/auth-rbac-matrix-test.js` | Endpoint matrix includes programs |
| `services/api/tmp-hardening/rbac-matrix.json` | GET/POST `/programs` status by role |
| `RBAC_TEST_REPORT.md` | Documents `POST /programs` RBAC |
| `SECURITY_REVIEW_REPORT.md` | Lists programs controller as RBAC-hardened |

### Missing

- `programs.service.spec.ts`
- Controller/integration tests
- API contract tests (`api-contract.spec.ts` covers subscriptions/notifications only)
- Admin web smoke tests
- Flutter widget/integration tests

---

## Programs — Working vs Missing Summary

| Working | Missing |
|---------|---------|
| `EmpowermentProgram` Prisma model + migration | Courses, lessons, enrollments, progress models |
| NestJS module wired in app | Prisma-backed service logic |
| 3 HTTP routes with JWT + RBAC | Admin/public route split, CRUD, publish/unpublish |
| Admin nav + middleware RBAC | `lib/programs`, CRUD UI, progress UI |
| Route security metadata tests | Service tests, integration tests, mobile |

---

# Mentorship Module

## Classification by Area

| Area | Classification | Completion % |
|------|----------------|--------------|
| 1. Prisma models | **Partially implemented** | **25%** |
| 2. Controllers/routes | **Placeholder/scaffold only** | **10%** |
| 3. Services/business logic | **Placeholder/scaffold only** | **5%** |
| 4. Admin web pages | **Placeholder/scaffold only** | **5%** |
| 5. Mobile screens | **Missing** | **0%** |
| 6. Tests | **Partially implemented** (RBAC metadata only) | **10%** |
| **Overall** | **Partially implemented** | **~12%** |

---

## 1. Prisma Models

**Classification:** Partially implemented

### Files involved

| File | Role |
|------|------|
| `services/api/prisma/schema.prisma` | `MentorshipClass` (lines 394–412), `MentorshipClassParticipant` (lines 434–444) |
| `services/api/prisma/migrations/20260521211453_auth_schema_sync/migration.sql` | Original `MentorshipSession` table |
| `services/api/prisma/migrations/20260523001204_sync_auth_schema/migration.sql` | Replaced with `MentorshipClass` + `MentorshipClassParticipant` |

### What exists

**Model:** `MentorshipClass`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `title` | String | Required |
| `description` | String? | Optional |
| `mentorName` | String? | Mentor display name |
| `startsAt` / `endsAt` | DateTime? | Schedule window |
| `status` | `ContentStatus` | DRAFT / PUBLISHED / ARCHIVED |
| `createdById` | String? | FK → `User` (`MentorshipCreator`) |
| `deletedAt` | DateTime? | Soft delete |
| `participants` | Relation | → `MentorshipClassParticipant[]` |

**Model:** `MentorshipClassParticipant`

| Field | Type | Notes |
|-------|------|-------|
| `mentorshipClassId` | String | FK → `MentorshipClass` |
| `userId` | String | FK → `User` |
| `joinedAt` | DateTime | Enrollment timestamp |
| Unique constraint | | `(mentorshipClassId, userId)` |

### What's missing

Per `docs/architecture.md`:

- `mentorship_sessions` (sub-session entities)
- Bookings
- Assignments
- Feedback

Schema supports participant enrollment at the DB level, but **no API** reads or writes `MentorshipClassParticipant`.

---

## 2. Controllers / Routes

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/mentorship/mentorship.controller.ts` | HTTP routes + JWT/RBAC guards |
| `services/api/src/modules/mentorship/mentorship.module.ts` | NestJS module registration |
| `services/api/src/app.module.ts` | Imports `MentorshipModule` |

### Route list

| Method | Route | Roles | Behavior |
|--------|-------|-------|----------|
| `GET` | `/api/v1/mentorship` | ADMIN, USER, MODERATOR | Stub: `{ module: 'mentorship', data: [] }` |
| `GET` | `/api/v1/mentorship/:id` | ADMIN, USER, MODERATOR | Stub: `{ module: 'mentorship', id }` |
| `POST` | `/api/v1/mentorship` | MODERATOR | Stub: echoes payload, `{ created: true }` |

### What's missing

Admin placeholder references routes **not in controller**:

- `POST /mentorship/sessions`
- `POST /mentorship/bookings`

Also missing:

- Participant join/leave endpoints
- Publish/unpublish, soft delete
- Public catalog routes
- Admin CRUD split
- DTOs and validation
- Assignment and feedback APIs

---

## 3. Services / Business Logic

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `services/api/src/modules/mentorship/mentorship.service.ts` | Stub service — **no PrismaService** |

### Working functionality

None beyond static JSON responses (identical stub pattern to Programs).

### Missing functionality

- Prisma CRUD for `MentorshipClass`
- Participant enrollment/unenrollment via `MentorshipClassParticipant`
- Booking workflow
- Assignment flow
- Feedback collection
- Content lifecycle (publish/unpublish, soft delete)
- Capacity limits, waitlists
- Notifications for class reminders

---

## 4. Admin Web Pages

**Classification:** Placeholder/scaffold only

### Files involved

| File | Role |
|------|------|
| `apps/admin-web/app/(protected)/mentorship/page.tsx` | Placeholder `ModulePage` |
| `apps/admin-web/components/nav-links.ts` | Nav: "Session and booking management" → `/mentorship` |
| `apps/admin-web/middleware.ts` | Route RBAC |
| `apps/admin-web/components/protected-module.tsx` | Role gate |

### Missing

| Expected path | Status |
|---------------|--------|
| `apps/admin-web/lib/mentorship/api-client.ts` | **Missing** |
| `apps/admin-web/lib/mentorship/types.ts` | **Missing** |
| Class CRUD UI | **Missing** |
| Participant/attendee view | **Missing** |
| Booking management | **Missing** |
| Assignment/feedback UI | **Missing** |

Admin placeholder copy:

```
GET /mentorship, POST /mentorship/sessions, POST /mentorship/bookings
```

Only the first route exists (as a stub); sessions and bookings routes are **not implemented**.

---

## 5. Mobile Screens

**Classification:** Missing

### Files involved

None. Zero mentorship files under `apps/mobile-flutter`.

### Missing

| Expected | Status |
|----------|--------|
| `lib/core/mentorship/` | **Missing** |
| Mentorship feed / class list screen | **Missing** |
| Class detail + join screen | **Missing** |
| Booking / assignment screens | **Missing** |
| Router + dashboard integration | **Missing** |

---

## 6. Tests

**Classification:** Partially implemented

### Files involved

| File | Coverage |
|------|----------|
| `services/api/src/security/route-security.spec.ts` | `MentorshipController`; `create` requires MODERATOR |
| `services/api/scripts/auth-rbac-matrix-test.js` | GET `/mentorship` in matrix |
| `services/api/tmp-hardening/rbac-mutations.ps1` | POST `/mentorship` mutation |
| `services/api/tmp-hardening/rbac-matrix.json` | Role status checks |
| `RBAC_TEST_REPORT.md` | POST `/mentorship` RBAC row |

### Missing

- `mentorship.service.spec.ts`
- Participant enrollment tests
- Integration/e2e tests
- Admin web tests
- Flutter tests

---

## Mentorship — Working vs Missing Summary

| Working | Missing |
|---------|---------|
| `MentorshipClass` + `MentorshipClassParticipant` models | Bookings, assignments, feedback models |
| NestJS module + 3 stub routes + RBAC | Prisma service, DTOs, full CRUD |
| Participant schema (unused by API) | Join/leave participant APIs |
| Admin nav + placeholder page | `lib/mentorship`, management UI |
| RBAC security tests | Business logic tests, mobile |

---

# Side-by-Side Comparison

| Capability | Events (reference) | Programs | Mentorship |
|------------|-------------------|----------|------------|
| Prisma models | Full + attendees | Base entity only | Class + participants |
| Prisma used in service | Yes | **No** | **No** |
| DTOs + validation | Yes | **No** | **No** |
| Public/admin routes | Yes | **No** | **No** |
| Publish/unpublish | Yes | **No** | **No** |
| Soft delete enforced | Yes | **No** | **No** |
| Admin `lib/{module}` | Yes | **No** | **No** |
| Admin CRUD UI | Yes | Placeholder | Placeholder |
| Mobile screens | Yes | **Missing** | **Missing** |
| Service unit tests | Yes | **No** | **No** |
| Estimated completion | ~85%+ | **~10%** | **~12%** |

---

# Recommended Implementation Plan

Follow the **Events module** as the primary template (public/admin split, DTOs, Prisma CRUD, publish/unpublish, soft delete, admin page, mobile tab). Use **eBooks** for progress/analytics patterns where applicable.

## Phase 1 — Backend foundation (both modules)

**Estimated effort:** 2–3 weeks per module

1. Add DTOs (`create-*.dto.ts`, `update-*.dto.ts`, `*-query.dto.ts`)
2. Rewrite services with `PrismaService`:
   - CRUD against existing models
   - Content status enforcement on public reads
   - Soft delete → `ARCHIVED` + `deletedAt`
3. Split controllers:
   - `GET /{module}/public`, `GET /{module}/admin`
   - `POST/PATCH/DELETE /{module}/admin/:id`
   - `PATCH /{module}/admin/:id/publish|unpublish`
4. Add unit tests (`*.service.spec.ts`) mirroring Events/Clips coverage
5. Add seed data for staging QA

**Programs-specific:** decide whether Phase 1 stops at program entity or extends schema with `ProgramEnrollment` + `ProgramProgress` before mobile work.

**Mentorship-specific:** wire `MentorshipClassParticipant` with join/leave endpoints in Phase 1; defer bookings/assignments/feedback to Phase 2 schema additions.

## Phase 2 — Admin web

**Estimated effort:** 1–2 weeks per module

1. Create `apps/admin-web/lib/{module}/types.ts` + `api-client.ts`
2. Replace placeholder pages with full management UI (list, create/edit form, publish toggle, delete)
3. **Mentorship:** add participant/attendee panel (mirror Events attendee view)
4. **Programs:** add enrollment/progress view once backend endpoints exist

## Phase 3 — Mobile

**Estimated effort:** 1–2 weeks per module

1. Create `lib/core/{module}/` (models, service)
2. Add list + detail screens
3. Wire router + dashboard navigation
4. **Mentorship:** join/leave class actions
5. **Programs:** enrollment + progress display
6. Widget tests for empty/loading/error states

## Phase 4 — Extended domain (optional, Phase 2 architecture vision)

**Programs:** courses, lessons, certificates, live sessions  
**Mentorship:** bookings, assignments, feedback, mentor profiles

---

# Completion Percentage Breakdown

## Programs (~10% overall)

| Layer | Weight | Score | Weighted |
|-------|--------|-------|----------|
| Prisma schema | 15% | 20% | 3.0% |
| Backend API | 30% | 10% | 3.0% |
| Admin web | 25% | 5% | 1.25% |
| Mobile | 25% | 0% | 0% |
| Tests | 5% | 10% | 0.5% |
| **Total** | | | **~8%** |

Rounded headline: **~10%** (scaffold + schema + security wiring only).

**MVP-scoped** (program entity CRUD + admin list, no courses/mobile): **~25%** once Phase 1–2 complete.

**Full Phase 2 vision** (courses, progress, mobile, analytics): remains **~10%** today.

## Mentorship (~12% overall)

| Layer | Weight | Score | Weighted |
|-------|--------|-------|----------|
| Prisma schema | 15% | 25% | 3.75% |
| Backend API | 30% | 10% | 3.0% |
| Admin web | 25% | 5% | 1.25% |
| Mobile | 25% | 0% | 0% |
| Tests | 5% | 10% | 0.5% |
| **Total** | | | **~8.5%** |

Rounded headline: **~12%** (participant model gives Mentorship a slight edge over Programs on schema).

**MVP-scoped** (class CRUD + participant join/leave + admin UI): **~30%** once Phase 1–2 complete.

**Full architecture vision** (bookings, assignments, feedback, mobile): remains **~12%** today.

---

# Priority Recommendations

1. **Unblock backend first** — both modules have schema but services ignore Prisma; this is the highest-leverage gap.
2. **Align admin placeholder copy with actual routes** — remove or implement referenced endpoints (`/programs/:id/progress`, `/mentorship/sessions`, `/mentorship/bookings`).
3. **Copy Events patterns verbatim** — fastest path to production parity for CRUD + lifecycle.
4. **Mentorship before Programs mobile** — participant model already exists; Programs needs enrollment schema decisions first.
5. **Do not ship mobile until admin CRUD is stable** — matches `STABILIZATION_PLAN.md` guidance.

---

# Document References

| Document | Relevance |
|----------|-----------|
| `docs/architecture.md` | Phase 2 scope for programs and mentorship |
| `STABILIZATION_PLAN.md` | Notes programs/mentorship as placeholders |
| `services/api/src/modules/events/` | Reference full-stack implementation |
| `apps/admin-web/lib/events/` | Reference admin API client pattern |
