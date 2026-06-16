# Phase 2 Push Notifications Implementation TODO

## Phase 2A – DB migration, Prisma schema, DTO contracts
- [x] Review existing Prisma schema for PushDeviceToken/PushDeliveryLog/Notification capabilities
- [x] Review existing push DTO contracts for register/refresh/revoke compatibility
- [x] Perform gap analysis (requirements vs implementation)
- [x] Confirm no migration/schema change required (no demonstrated functional gaps)
- [x] Mark Phase 2A COMPLETE (no-op)

## Phase 2B – Device registration APIs
- [ ] Update push controller routes/contracts
- [ ] Update push service register/unregister/list/refresh logic
- [ ] Add ownership and duplicate registration safeguards
- [ ] Add/adjust endpoint tests

## Phase 2C – FCM integration + delivery logging
- [ ] Implement Firebase Admin SDK provider integration
- [ ] Replace simulated FCM send logic with real provider abstraction
- [ ] Extend push delivery logging fields/status handling
- [ ] Add service/provider tests for success/failure mapping

## Phase 2D – Announcement publish notifications + idempotency
- [ ] Integrate push trigger into announcements publish flow
- [ ] Ensure dedupe/idempotency with pushNotificationSent + dedupe key
- [ ] Ensure notification center record linkage for announcements
- [ ] Add publish flow integration tests

## Phase 2E – Retry processor
- [ ] Implement retry service and processor
- [ ] Add exponential backoff with max retry
- [ ] Skip retries for invalid tokens
- [ ] Add retry behavior tests

## Phase 2F – Flutter integration + deep links + notification center updates
- [ ] Add Firebase messaging dependencies/init wiring
- [ ] Implement token register/refresh/unregister wiring
- [ ] Implement foreground/background/terminated message handling
- [ ] Implement deep links to announcement details
- [ ] Update notification center provider/screen behavior
- [ ] Add Flutter tests

## Phase 2G – Admin reporting
- [ ] Add backend admin notification stats endpoints
- [ ] Add admin-web API client/types/hooks for stats
- [ ] Update admin notifications page with reporting widgets
- [ ] Add admin reporting tests

## Phase 2H – Thorough testing + evidence + readiness score
- [ ] Run full endpoint matrix tests (success/error/edge/security)
- [ ] Run security matrix tests (anonymous/user/admin/super-admin)
- [ ] Validate delivery/retry/dedupe evidence
- [ ] Validate Flutter notification and deep-link evidence
- [ ] Validate admin reporting evidence
- [ ] Produce final readiness score and defect list
