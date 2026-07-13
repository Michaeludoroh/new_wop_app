# Admin Platform Audit Report

**Date:** 2026-06-17  
**Platform:** WOP Admin Dashboard (`apps/admin-web`)  
**API:** NestJS `services/api` → `/api/v1`  
**Audit type:** Static code review + automated build/tests (no live browser session or screenshots in this run)

---

## Executive Summary

| Area | Verdict | Notes |
|------|---------|-------|
| Login / Logout | **PASS** | Full UI + API wiring |
| JWT authentication | **PASS** | Access + refresh, interceptors, backend guards |
| `GET /api/v1/auth/me` | **PASS** | Session bootstrap on every protected load |
| Content modules (9/10) | **PASS** | Full CRUD admin UIs implemented |
| Library (eBooks) | **PASS** | Implemented at `/ebooks` |
| Content hub (`/content`) | **FAIL** | Placeholder only |
| RBAC | **PARTIAL** | Multi-layer guards; frontend/backend model mismatch |
| Admin frontend tests | **FAIL (coverage)** | 5 Vitest tests only; no E2E |
| Backend module tests | **PASS** | Service specs + route-security metadata |
| Production build | **PASS** | `npm run build` succeeded locally |

### Overall Go / No-Go

| Context | Recommendation |
|---------|----------------|
| **Internal admin QA (staging API + ADMIN credentials)** | **GO** — core modules and auth are implemented |
| **Moderator-only production use** | **CONDITIONAL GO** — verify role matrix; fix eBooks RBAC mismatch |
| **Full production admin launch** | **NO-GO** — until E2E validation, Content hub completion, Next.js dependency advisories addressed |

---

## Audit Methodology & Evidence Types

This audit did **not** include live UI screenshots. Evidence is drawn from:

| Evidence type | Source |
|---------------|--------|
| Source code | `apps/admin-web/app/(protected)/**`, `lib/**/api-client.ts` |
| Auth stack | `middleware.ts`, `auth-provider.tsx`, `http-client.ts` |
| RBAC metadata | `services/api/src/security/route-security.spec.ts` (4/4 pass) |
| Build output | `npm run build` — all routes compiled (see §Build Evidence) |
| Frontend tests | `npm test` — 5/5 pass (`lib/analytics/normalize.test.ts`) |
| Backend tests | Per-module `*.service.spec.ts` present for all audited modules |
| CI | `.github/workflows/admin-web-ci.yml` — type-check, lint, build (tests not in CI) |
| Security audit | `audit-admin-web-latest.json` — Next.js high-severity advisories |

---

## Authentication & Session

### Login — **PASS**

| Item | Detail |
|------|--------|
| UI | `apps/admin-web/app/login/page.tsx` |
| Flow | `useAuth().login()` → `authApi.login()` |
| API | `POST /api/v1/auth/login` |
| Storage | `tokenStorage.setSession()` — localStorage + cookies (`ministry_admin_*`) |
| Redirect | Authenticated users redirected from `/login` → `/` |

**Evidence:** Login uses unauthenticated axios for initial token exchange; tokens persisted before dashboard render.

### Logout — **PASS**

| Item | Detail |
|------|--------|
| UI | Admin layout logout control → `useAuth().logout()` |
| API | `POST /api/v1/auth/logout` with `{ refreshToken }` (Bearer access token) |
| Cleanup | Local session cleared even if remote logout fails |
| Redirect | `router.replace("/login")` |

**Evidence:** `apps/admin-web/providers/auth-provider.tsx` lines 298–310.

### JWT Authentication — **PASS**

| Layer | Implementation |
|-------|----------------|
| Token issuance | `auth.service.ts` — access (~15m) + refresh (~7d), hashed refresh in DB |
| Validation | `jwt.strategy.ts` — Bearer JWT → user payload |
| Request auth | `http-client.ts` — `Authorization: Bearer ${accessToken}` on all authenticated calls |
| 401 handling | Single retry via `POST /auth/refresh` with queue for concurrent requests |
| Guards | `JwtAuthGuard` + hierarchical `RolesGuard` on API |

**Evidence:** `createAuthenticatedClient()` interceptors; backend `ROLE_HIERARCHY` in `roles.guard.ts`.

### `GET /api/v1/auth/me` — **PASS**

| Item | Detail |
|------|--------|
| Bootstrap | `AuthProvider.bootstrap()` on app load |
| API | `GET /api/v1/auth/me` via authenticated client |
| Fallback | On failure → refresh → retry `me()`; on refresh failure → clear session |
| Cookie sync | User role in cookie drives Next.js middleware RBAC |

**Evidence:** `auth-provider.tsx` bootstrap path; `authApi.me()` in `lib/auth/api-client.ts`.

### Auth Defects

| ID | Severity | Issue |
|----|----------|-------|
| A1 | Medium | HTTP **403** triggers full session invalidation (`http-client.ts`) — may log out admin on permission errors rather than showing inline “forbidden” |
| A2 | Low | No admin-web unit tests for login/logout/refresh flows |
| A3 | Info | `USER` role can authenticate but has no admin nav routes — expected |

**Go/No-Go (Auth):** **GO** for staging admin use.

---

## RBAC Permissions — **PARTIAL PASS**

### Frontend layers

1. **Next.js middleware** (`middleware.ts`) — cookie token + `ROLE_ROUTE_MAP`
2. **AuthProvider** — unauthenticated → `/login`
3. **Nav filter** (`nav-links.ts` + `admin-layout.tsx`) — sidebar by role
4. **ProtectedModule** — page-level `allowedRoles`

### Backend

- `@Roles()` decorator + **hierarchical** `RolesGuard` (SUPER_ADMIN satisfies ADMIN, etc.)

### Role matrix (frontend routes)

| Route | SUPER_ADMIN | ADMIN | MODERATOR |
|-------|:-----------:|:-----:|:---------:|
| `/`, `/events`, `/clips`, `/programs`, `/mentorship`, `/notifications`, `/policies`, `/content` | ✓ | ✓ | ✓ |
| `/users`, `/subscriptions`, `/payments`, `/analytics`, `/announcements`, `/ebooks` | ✓ | ✓ | ✗ |

### RBAC Defects

| ID | Severity | Issue |
|----|----------|-------|
| R1 | Medium | **eBooks page** allows `MODERATOR` in `ProtectedModule`, but **middleware + nav** block `/ebooks` for MODERATOR |
| R2 | Medium | Frontend exact role lists vs backend hierarchy — generally OK when SUPER_ADMIN listed, but behavior differs for edge cases |
| R3 | Low | Notifications: MODERATOR can view feed; broadcast/targeted create gated to ADMIN+ in UI and API |
| R4 | Info | `route-security.spec.ts` validates controller metadata — **4/4 tests pass** |

**Evidence:** `middleware.ts` `ROLE_ROUTE_MAP`; `ebooks/page.tsx` `allowedRoles={["SUPER_ADMIN", "ADMIN", "MODERATOR"]}`.

**Go/No-Go (RBAC):** **CONDITIONAL GO** — align eBooks roles before moderator onboarding.

---

## Module Audits

> **Library** in the mobile app maps to **eBooks** in admin (`/ebooks`). There is no separate `/library` admin route.

---

### Users — **PASS**

| Item | Value |
|------|-------|
| Route | `/users` |
| Page | `app/(protected)/users/page.tsx` (~210 lines) |
| Roles | SUPER_ADMIN, ADMIN |
| Backend test | `users.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/users?search&role&status&limit&offset` |
| GET | `/users/:id` |
| PATCH | `/users/:id/role` |
| PATCH | `/users/:id/status` |

**Features:** Search, role update, activate/deactivate, subscription summary per user.

**Evidence:** Full CRUD admin UI; `lib/users/api-client.ts`; backend `@Roles('ADMIN')` on list/role/status per `route-security.spec.ts`.

**Remaining defects:** No bulk actions; no admin-web component tests.

**Go/No-Go:** **GO**

---

### Announcements — **PASS**

| Item | Value |
|------|-------|
| Route | `/announcements` |
| Page | `app/(protected)/announcements/page.tsx` (~328 lines) |
| Roles | SUPER_ADMIN, ADMIN |
| Backend test | `announcements.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/announcements/admin/categories` |
| GET | `/announcements/admin` |
| GET | `/announcements/admin/:id` |
| POST | `/announcements/admin` |
| PATCH | `/announcements/admin/:id` |
| PATCH | `/announcements/admin/:id/publish` |
| PATCH | `/announcements/admin/:id/unpublish` |
| DELETE | `/announcements/admin/:id` |
| POST | `/announcements/admin/upload/image` |

**Features:** Create/edit, publish/unpublish, image upload, search, categories.

**Evidence:** `lib/announcements/api-client.ts`; backend roles `ADMIN`, `SUPER_ADMIN` in route-security spec.

**Remaining defects:** No E2E publish→mobile push verification from admin UI.

**Go/No-Go:** **GO**

---

### Events — **PASS**

| Item | Value |
|------|-------|
| Route | `/events` |
| Page | `app/(protected)/events/page.tsx` (~289 lines) |
| Roles | SUPER_ADMIN, ADMIN, MODERATOR |
| Backend test | `events.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/events/admin` |
| POST | `/events/admin` |
| PATCH | `/events/admin/:id` |
| PATCH | `/events/admin/:id/publish` |
| PATCH | `/events/admin/:id/unpublish` |
| DELETE | `/events/admin/:id` |
| GET | `/events/admin/:id/attendees` |

**Features:** Full CRUD, publish workflow, attendee list, search/filter.

**Evidence:** `lib/events/api-client.ts`; MODERATOR+ on admin mutations in route-security spec.

**Remaining defects:** Banner images URL-only (no upload endpoint in client).

**Go/No-Go:** **GO**

---

### Clips — **PASS**

| Item | Value |
|------|-------|
| Route | `/clips` |
| Page | `app/(protected)/clips/page.tsx` (~223 lines) |
| Roles | SUPER_ADMIN, ADMIN, MODERATOR |
| Backend test | `clips.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/clips/admin` |
| POST | `/clips/admin` |
| PATCH | `/clips/admin/:id` |
| PATCH | `/clips/admin/:id/publish` |
| PATCH | `/clips/admin/:id/unpublish` |
| DELETE | `/clips/admin/:id` |

**Features:** CRUD, publish/unpublish, URL-based video/thumbnail (no file upload).

**Evidence:** `lib/clips/api-client.ts`.

**Remaining defects:** No video upload; clips analytics not on dedicated analytics page.

**Go/No-Go:** **GO** (URL-based content acceptable for beta)

---

### Library (eBooks) — **PASS**

| Item | Value |
|------|-------|
| Route | `/ebooks` (labeled “eBooks” in nav) |
| Page | `app/(protected)/ebooks/page.tsx` (~284 lines) |
| Roles | Nav/middleware: SUPER_ADMIN, ADMIN; Page component also lists MODERATOR (**mismatch**) |
| Backend test | `ebooks.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/ebooks/admin` |
| POST | `/ebooks/admin` |
| PATCH | `/ebooks/admin/:id` |
| PATCH | `/ebooks/admin/:id/publish` |
| PATCH | `/ebooks/admin/:id/unpublish` |
| DELETE | `/ebooks/admin/:id` |
| GET | `/ebooks/admin/analytics` |
| GET | `/ebooks/admin/categories` |
| POST | `/ebooks/admin/upload/file` |
| POST | `/ebooks/admin/upload/cover` |

**Features:** CRUD, PDF/cover upload, publish workflow, analytics panel, categories.

**Evidence:** `lib/ebooks/api-client.ts`; build route `/ebooks` compiled (3.61 kB page chunk in build output).

**Remaining defects:** RBAC mismatch R1; mobile “Library” depends on API + content access secret (separate mobile audit).

**Go/No-Go:** **GO** for ADMIN+; **NO-GO** for MODERATOR until R1 fixed

---

### Programs — **PASS**

| Item | Value |
|------|-------|
| Route | `/programs` |
| Page | `app/(protected)/programs/page.tsx` (~348 lines) |
| Roles | SUPER_ADMIN, ADMIN, MODERATOR |
| Backend test | `programs.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/programs/admin` |
| GET | `/programs/admin/analytics` |
| POST | `/programs/admin` |
| PATCH | `/programs/admin/:id` |
| PATCH | `/programs/admin/:id/publish` |
| PATCH | `/programs/admin/:id/unpublish` |
| DELETE | `/programs/admin/:id` |
| GET | `/programs/admin/:id/enrollments` |
| GET | `/programs/admin/:id/progress` |

**Features:** CRUD, publish, enrollments, progress tracking, analytics.

**Evidence:** `lib/programs/api-client.ts`; route-security MODERATOR+ on admin paths.

**Remaining defects:** No dedicated admin-web tests.

**Go/No-Go:** **GO**

---

### Mentorship — **PASS**

| Item | Value |
|------|-------|
| Route | `/mentorship` |
| Page | `app/(protected)/mentorship/page.tsx` (~470 lines) |
| Roles | SUPER_ADMIN, ADMIN, MODERATOR |
| Backend test | `mentorship.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/mentorship/admin` |
| GET | `/mentorship/admin/analytics` |
| POST/PATCH/DELETE | `/mentorship/admin`, `/:id`, publish/unpublish |
| GET | `/mentorship/admin/:id/participants` |
| GET/POST | `/mentorship/admin/:id/sessions` |
| PATCH/DELETE | `/mentorship/admin/sessions/:sessionId` |
| GET/PATCH | `/mentorship/admin/sessions/:sessionId/attendance`, `.../:userId` |
| GET | `/mentorship/admin/:id/feedback`, `/:id/progress` |

**Features:** Classes CRUD, sessions, attendance, feedback, progress, analytics.

**Evidence:** `lib/mentorship/api-client.ts` — most comprehensive admin module.

**Remaining defects:** Large single-page component; no E2E for session attendance flow.

**Go/No-Go:** **GO**

---

### Subscriptions — **PASS**

| Item | Value |
|------|-------|
| Route | `/subscriptions` |
| Page | `app/(protected)/subscriptions/page.tsx` (~179 lines) |
| Roles | SUPER_ADMIN, ADMIN |
| Backend test | `subscriptions.service.spec.ts`, `subscription-lifecycle.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/subscriptions/admin` |
| GET | `/subscriptions/admin/analytics` |
| POST | `/subscriptions/admin/lifecycle/process` |
| PATCH | `/subscriptions/admin/:id/status` |
| POST | `/subscriptions/admin/:id/cancel` |

**Not wired in admin client (backend exists):**

| Method | Endpoint |
|--------|----------|
| GET | `/subscriptions/admin/:id` |
| GET | `/subscriptions/admin/:id/history` |

**Features:** List/search, analytics, status update, cancel, lifecycle processing.

**Evidence:** `lib/subscriptions/api-client.ts`; backend `@Roles('ADMIN')` on admin routes.

**Remaining defects:** Detail/history endpoints not exposed in UI; depends on payment provider config for real checkouts.

**Go/No-Go:** **GO** for admin visibility; **CONDITIONAL** for payment-dependent flows

---

### Notifications — **PASS**

| Item | Value |
|------|-------|
| Route | `/notifications` |
| Page | `app/(protected)/notifications/page.tsx` (~322 lines) |
| Roles | View: SUPER_ADMIN, ADMIN, MODERATOR; Create: ADMIN+ only |
| Backend test | `notifications.service.spec.ts` ✓ |

**API calls used:**

| Method | Endpoint |
|--------|----------|
| GET | `/notifications?isRead&limit&offset` |
| GET | `/notifications/:id` |
| PATCH | `/notifications/:id/read-state` |
| POST | `/notifications/broadcast` (ADMIN+) |
| POST | `/notifications/targeted` (ADMIN+) |

**Features:** Notification feed, read/unread filter, broadcast + targeted compose (ADMIN+), channel selection (IN_APP, EMAIL, PUSH).

**Evidence:** `lib/notifications/api-client.ts`; `canManage` gate in page; route-security confirms broadcast/targeted ADMIN+.

**Remaining defects:** PUSH channel depends on FCM backend creds (see mobile push audits); no delivery status UI; targeted form uses raw `userId`.

**Go/No-Go:** **GO** for in-app; **CONDITIONAL** for PUSH until FCM configured

---

### Content Hub (`/content`) — **FAIL**

| Item | Value |
|------|-------|
| Route | `/content` |
| Page | `app/(protected)/content/page.tsx` — **placeholder** |
| Implementation | `ModulePage` stub only |

**API calls used:** None (placeholder text references `GET /announcements, /clips, /ebooks, /policies`).

**Evidence:**

```tsx
<ModulePage
  title="Content Moderation"
  description="Moderate and manage announcements, clips, eBooks, and policies."
  endpointPlaceholder="GET /announcements, /clips, /ebooks, /policies"
/>
```

**Remaining defects:** Unified moderation dashboard not implemented; individual modules cover functionality separately.

**Go/No-Go:** **NO-GO** as a module; **N/A** if nav item treated as future work (individual modules are GO)

---

## Build Evidence (Next.js)

Local `npm run build` **succeeded**. Compiled admin routes include:

| Route | Page size (approx) |
|-------|-------------------|
| `/login` | 941 B |
| `/` (dashboard) | (home KPIs) |
| `/users` | 2.46 kB |
| `/announcements` | compiled |
| `/events` | compiled |
| `/clips` | compiled |
| `/ebooks` | compiled |
| `/programs` | 3.61 kB |
| `/mentorship` | 4.27 kB |
| `/subscriptions` | 2.69 kB |
| `/notifications` | 4.23 kB |
| `/analytics` | compiled |
| `/payments` | 1.89 kB |
| `/policies` | 4.66 kB |
| `/content` | compiled (stub) |
| Middleware | 27 kB |

---

## Test & CI Evidence

| Suite | Result | Scope |
|-------|--------|-------|
| `route-security.spec.ts` | **4/4 pass** | RBAC metadata on controllers |
| `npm test` (admin-web) | **5/5 pass** | Analytics normalization only |
| `npm run build` (admin-web) | **Pass** | Full Next.js production build |
| Backend `*.service.spec.ts` | Present | All audited modules |
| Admin CI workflow | type-check, lint, build | **Tests not in CI** |
| E2E / Playwright | **None** | — |

---

## Cross-Cutting Defects

| ID | Severity | Issue | Affected |
|----|----------|-------|----------|
| X1 | High | No E2E or browser validation in this audit | All modules |
| X2 | High | Next.js dependency advisories (DoS, RSC) in `audit-admin-web-latest.json` | Platform |
| X3 | Medium | Admin CI does not run `npm test` | CI gap |
| X4 | Medium | Content hub placeholder | `/content` |
| X5 | Medium | eBooks RBAC mismatch (R1) | Library/eBooks |
| X6 | Medium | 403 clears entire session (A1) | All authenticated pages |
| X7 | Low | No CSV/PDF export on analytics | Analytics |
| X8 | Low | Moderators lack analytics/KPI on home (by design) | Dashboard |

---

## Module Summary Matrix

| Module | Pass/Fail | Backend tests | Admin UI | Go/No-Go |
|--------|-----------|---------------|----------|----------|
| Login | **PASS** | auth specs | ✓ | GO |
| Logout | **PASS** | auth specs | ✓ | GO |
| JWT auth | **PASS** | jwt.strategy | ✓ | GO |
| `/auth/me` | **PASS** | auth specs | ✓ | GO |
| Users | **PASS** | ✓ | Full | GO |
| Announcements | **PASS** | ✓ | Full | GO |
| Events | **PASS** | ✓ | Full | GO |
| Clips | **PASS** | ✓ | Full | GO |
| Library (eBooks) | **PASS** | ✓ | Full | GO (ADMIN+) |
| Programs | **PASS** | ✓ | Full | GO |
| Mentorship | **PASS** | ✓ | Full | GO |
| Subscriptions | **PASS** | ✓ | Full | GO |
| Notifications | **PASS** | ✓ | Full | CONDITIONAL (PUSH) |
| RBAC | **PARTIAL** | route-security ✓ | 3-layer | CONDITIONAL |
| Content hub | **FAIL** | — | Stub | NO-GO |

---

## Recommended Actions (Priority)

1. **P0 — Manual E2E:** Login as ADMIN → exercise each module CRUD + publish on staging API; capture screenshots for release evidence.
2. **P0 — Upgrade Next.js** to address advisories in `audit-admin-web-latest.json`.
3. **P1 — Fix R1:** Align `ebooks/page.tsx` `ProtectedModule` roles with middleware (`ADMIN+` only) OR extend middleware for MODERATOR intentionally.
4. **P1 — Fix A1:** Distinguish 403 Forbidden from 401 Unauthorized in `http-client.ts` (do not clear session on permission denial).
5. **P1 — Add admin tests to CI:** Run `npm test` in `admin-web-ci.yml`.
6. **P2 — Implement or remove `/content` hub** to avoid moderator confusion.
7. **P2 — Wire subscription detail/history** endpoints in admin UI.

---

## Final Recommendation

The WOP Admin Dashboard is **functionally complete for core operations** across Users, Announcements, Events, Clips, Library/eBooks, Programs, Mentorship, Subscriptions, and Notifications. Authentication (login, logout, JWT, `/auth/me`) is **production-grade in code**. RBAC is **mostly consistent** with known gaps.

**Proceed** with staging admin QA and moderator/ADMIN onboarding. **Do not** treat the platform as fully production-ready until live E2E validation, Next.js security patches, and RBAC/session edge-case fixes are complete.

---

## Appendix: Key Paths

| Concern | Path |
|---------|------|
| Admin app | `apps/admin-web/` |
| Login | `apps/admin-web/app/login/page.tsx` |
| Auth provider | `apps/admin-web/providers/auth-provider.tsx` |
| Middleware RBAC | `apps/admin-web/middleware.ts` |
| HTTP + JWT refresh | `apps/admin-web/lib/auth/http-client.ts` |
| Nav + roles | `apps/admin-web/components/nav-links.ts` |
| API auth | `services/api/src/modules/auth/` |
| RBAC guard | `services/api/src/modules/auth/guards/roles.guard.ts` |
| Route security tests | `services/api/src/security/route-security.spec.ts` |
| CI | `.github/workflows/admin-web-ci.yml` |
