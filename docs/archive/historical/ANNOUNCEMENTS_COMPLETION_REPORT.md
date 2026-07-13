# Announcements Module — Completion Report

**Date:** June 11, 2026  
**Baseline:** ~68% (see `ANNOUNCEMENTS_ADMIN_AUDIT.md`)  
**Updated completion:** **~91%**

---

## Summary

The Announcements module is now end-to-end across backend API, admin web, and Flutter mobile. Category and image URL persistence, draft/unpublish/soft-delete workflows, public and admin detail endpoints, search/filter, image upload, admin CRUD UI, and a dedicated mobile tab with feed and detail screens are implemented and validated.

---

## Files Changed

### Backend (`services/api`)

| File | Change |
|------|--------|
| `src/modules/announcements/announcements.service.ts` | Persists `category`, `imageUrl`, `isPublished`; draft/publish/unpublish/soft-delete; public & admin detail; search/category/status filters; category listing |
| `src/modules/announcements/announcements-upload.service.ts` | **New** — multipart image upload to `uploads/announcements/image/` |
| `src/modules/announcements/announcements.controller.ts` | Added `GET public/categories`, `GET admin/categories`, `GET public/:id`, `GET admin/:id`, `POST admin/upload/image`; existing CRUD/publish/unpublish/delete wired |
| `src/modules/announcements/announcements.module.ts` | Registers upload service |
| `src/modules/announcements/dto/announcement-query.dto.ts` | Category filter validated against `ANNOUNCEMENT_CATEGORIES` |
| `src/modules/announcements/announcements.service.spec.ts` | Expanded unit tests (persistence, filter, soft delete, unpublish, notifications, categories) |
| `src/security/route-security.spec.ts` | RBAC coverage for admin categories and image upload routes |

### Admin Web (`apps/admin-web`)

| File | Change |
|------|--------|
| `lib/announcements/types.ts` | Added `imageUrl`, pagination meta, categories, payload types |
| `lib/announcements/api-client.ts` | Full CRUD + publish/unpublish/delete + upload + categories + meta normalization |
| `lib/announcements/hooks.ts` | `useAnnouncementsFeed`, `useAnnouncementMutation` (save/publish/unpublish/remove/upload) |
| `app/(protected)/announcements/page.tsx` | Full rewrite — create/edit form, draft checkbox, image URL + file upload, search/status/category filters, row actions |

### Flutter Mobile (`apps/mobile-flutter`)

| File | Change |
|------|--------|
| `lib/core/announcements/models/announcement_models.dart` | **New** — list/detail/category models |
| `lib/core/announcements/announcement_service.dart` | **New** — public list, detail, categories API client |
| `lib/screens/announcements_screen.dart` | **New** — feed with search, category filter, pull-to-refresh, images, empty/loading/error states |
| `lib/screens/announcement_details_screen.dart` | **New** — detail view + share (clipboard) |
| `lib/core/router/app_router.dart` | Routes for announcements list and detail |
| `lib/screens/dashboard_screen.dart` | Dedicated Announcements bottom-nav tab (embedded feed) |
| `test/announcements_screen_test.dart` | **New** — widget test for empty state |

---

## Feature Checklist

### Backend

| Requirement | Status |
|-------------|--------|
| Fix category persistence | Done |
| Fix imageUrl persistence | Done |
| Draft support | Done (`status: DRAFT`, `isPublished: false`) |
| Unpublish support | Done (`PATCH admin/:id/unpublish`) |
| Soft delete | Done (`deletedAt` filter + `DELETE admin/:id`) |
| Announcement detail endpoint | Done (`GET public/:id`, `GET admin/:id`) |
| Announcement search/filter | Done (search, category, status, pagination) |
| Unit tests | Done (9 service tests + 3 validation tests + route security) |

### Admin Web

| Requirement | Status |
|-------------|--------|
| Edit announcement | Done |
| Delete announcement | Done |
| Draft workflow | Done |
| Unpublish workflow | Done |
| Category management | Done (predefined categories via API; filter + form select) |
| Image upload management | Done (URL field + file upload) |
| Search/filter improvements | Done (search, status, category) |

### Flutter Mobile

| Requirement | Status |
|-------------|--------|
| Dedicated Announcements tab | Done (dashboard index 2) |
| Announcement feed | Done |
| Announcement detail screen | Done |
| Category filtering | Done |
| Image support | Done |
| Pull-to-refresh | Done |
| Share functionality | Done (clipboard) |
| Empty/loading/error states | Done |

---

## Validation Results

| Command | Location | Result |
|---------|----------|--------|
| `npx prisma generate` | `services/api` | **Pass** — Prisma Client generated |
| `npm run build` | `services/api` | **Pass** — Nest build succeeded |
| `npm test` | `services/api` | **Pass** — 23 suites, **109 tests** passed |
| `npm run build` | `apps/admin-web` | **Pass** — Next.js production build; `/announcements` route included |
| `flutter analyze` | `apps/mobile-flutter` | **14 info-level lints** — all pre-existing in other screens (ebooks, library, subscription); **no issues in announcements files** |
| `flutter test test/announcements_screen_test.dart` | `apps/mobile-flutter` | **Pass** — 1 test (empty state) |

---

## Remaining Gaps (~9%)

| Gap | Impact | Notes |
|-----|--------|-------|
| **ARCHIVED status workflow** | Low | Schema supports `ARCHIVED`; admin/mobile do not expose archive/unarchive actions |
| **Notification → announcement deeplink** | Medium | Push/in-app notifications still do not navigate to `AnnouncementDetailsScreen` |
| **Admin web tests** | Medium | No unit/E2E tests for announcements page or hooks |
| **Flutter test coverage** | Medium | Only empty-state widget test; no detail/loading/error/share tests |
| **Dynamic category CRUD** | Low | Categories are enum-backed constants; no admin UI to add/rename categories |
| **Bottom nav density** | Low | 8 tabs may feel crowded on small devices |
| **Pre-existing analyze infos** | Low | 14 `info` lints in non-announcement Flutter files |

---

## Updated Completion Score

| Area | Before | After |
|------|--------|-------|
| Prisma models | 95% | 95% |
| Controllers/routes | 95% | 98% |
| Services/business logic | 72% | 95% |
| Admin web pages | 45% | 88% |
| Mobile screens | 15% | 88% |
| Notification integration | 90% | 90% |
| Publish/unpublish workflow | 70% | 95% |
| Tests | 55% | 82% |
| **Overall Announcements** | **~68%** | **~91%** |

---

## API Surface (Quick Reference)

| Method | Route | Access |
|--------|-------|--------|
| GET | `/announcements/public` | Public — published list |
| GET | `/announcements/public/categories` | Public |
| GET | `/announcements/public/:id` | Public — detail |
| GET | `/announcements/admin` | Admin — all non-deleted |
| GET | `/announcements/admin/categories` | Admin |
| GET | `/announcements/admin/:id` | Admin — detail |
| POST | `/announcements/admin` | Admin — create |
| POST | `/announcements/admin/upload/image` | Admin — image upload |
| PATCH | `/announcements/admin/:id` | Admin — update |
| PATCH | `/announcements/admin/:id/publish` | Admin — publish + notify |
| PATCH | `/announcements/admin/:id/unpublish` | Admin — revert to draft |
| DELETE | `/announcements/admin/:id` | Admin — soft delete |

Response shape uses `content` (mapped from DB `body`), `category`, `imageUrl`, `status`, `isPublished`, and paginated `meta` on list endpoints.
