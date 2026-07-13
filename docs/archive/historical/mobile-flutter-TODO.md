# Announcements Module – Implementation TODO (Approved Plan)

## Phase 1 – Backend/Data Layer (Current)
- [ ] Extend Prisma `Announcement` schema (non-breaking evolution):
  - [ ] add `category`
  - [ ] add `imageUrl`
  - [ ] add `isPublished`
  - [ ] add `pushNotificationSent`
  - [ ] preserve compatibility with existing `body` (map to `content` at API layer)
  - [ ] keep `adminUserId` and expose as `publishedBy` in API response
- [ ] Create migration for schema changes.
- [ ] Add DTOs with validation + sanitization:
  - [ ] create announcement dto
  - [ ] update announcement dto
  - [ ] list query dto (pagination/search/category/status)
  - [ ] params dto
- [ ] Implement user endpoints:
  - [ ] `GET /api/v1/announcements`
  - [ ] `GET /api/v1/announcements/:id`
- [ ] Implement admin endpoints:
  - [ ] `GET /api/v1/admin/announcements`
  - [ ] `POST /api/v1/admin/announcements`
  - [ ] `PUT /api/v1/admin/announcements/:id`
  - [ ] `DELETE /api/v1/admin/announcements/:id`
  - [ ] `POST /api/v1/admin/announcements/:id/publish`
  - [ ] `POST /api/v1/admin/announcements/:id/unpublish`
- [ ] Add pagination, search, category filter.
- [ ] Add robust error handling (404/400/403/409 as applicable).
- [ ] Add audit logging for create/update/delete/publish/unpublish.
- [ ] Ensure JWT + role enforcement (admin routes restricted).
- [ ] Add/update backend tests for Phase 1.
- [ ] Run backend tests and capture evidence.
- [ ] Produce Phase 1 report:
  - [ ] files created/modified
  - [ ] migration summary
  - [ ] endpoint matrix
  - [ ] test results
  - [ ] defects
  - [ ] updated completion percentage

## Phase 2 – Push Notifications (Pending, do not start yet)
- [ ] Publish-triggered push dispatch using existing push infrastructure.
- [ ] Delivery status persistence + retry + dedupe.

## Phase 3 – Mobile UI (Pending)
- [ ] Announcements list/details screens with refresh/infinite/search/filter/share/read-state/deeplink.

## Phase 4 – Admin Dashboard (Pending)
- [ ] Full CRUD/publish/unpublish/stats management UI and API client updates.

## Phase 5 – Testing & Validation (Pending)
- [ ] Full backend/frontend regression + readiness report.
