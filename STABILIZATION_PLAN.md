# Stabilization Plan

This plan converts the repository audit findings into a foundation-first implementation sequence. The goal is to make the platform deployable, testable, and internally consistent before adding new product features.

## Guiding Principles

- Fix schema, configuration, and contract drift before expanding modules.
- Treat payment, notification, auth, and RBAC paths as security-sensitive.
- Prefer one source of truth for environment variables, API contracts, and migrations.
- Add validation gates as each area is stabilized so regressions are caught early.
- Do not build new feature surface until the foundational blockers below are closed.

## Recommended Implementation Order

1. Prisma migration drift
2. Environment variable drift
3. Mobile/backend DTO mismatches
4. Security gaps and RBAC coverage
5. Payment integration completion
6. Notification completion with Firebase Messaging and Socket.IO
7. Admin placeholder modules

This order is intentional: database correctness and runtime configuration must be stable before clients, payments, notifications, and admin modules can be validated reliably.

## 1. Prisma Migration Drift

Risk level: Critical

Problem:
The Prisma schema describes the current platform, but official migrations do not create several runtime-required tables and columns. Fresh environments using `prisma migrate deploy` are likely to differ from development databases and may fail at runtime.

Files affected:
- `services/api/prisma/schema.prisma`
- `services/api/prisma/migrations/**/migration.sql`
- `services/api/src/prisma/seed.ts`
- `services/api/prisma/seed.js`
- `services/api/tmp-hardening/*.sql`
- `services/api/package.json`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/_deploy-reusable.yml`

Estimated effort:
4-7 days.

Dependencies:
- Agreement on whether existing deployed databases must be preserved or can be rebuilt.
- Access to the current development/staging database schema for diffing.
- A clear decision on folding `tmp-hardening/*.sql` into official Prisma migrations.

Implementation plan:
1. Generate a migration diff from the current Prisma schema to an empty database.
2. Compare that diff against the official migration chain.
3. Create a reconciling migration that officially adds or aligns:
   - `UserSubscription`
   - `PaymentTransaction`
   - `PaymentWebhookEvent`
   - `PushDeviceToken`
   - `PushDeliveryLog`
   - announcement category/image/publish/push fields
   - notification announcement linkage
   - subscription plan billing interval and metadata fields
4. Rename, migrate, or drop legacy `Payment`, `Subscription`, and `SubscriptionInterval` artifacts.
5. Remove reliance on manual `tmp-hardening/*.sql` scripts for normal deploys.
6. Regenerate Prisma client.
7. Rebuild or remove stale compiled Prisma seed output.
8. Add migration deploy validation to CI and deployment.

Validation steps:
- Run `prisma migrate reset` in a disposable local database.
- Run `prisma migrate deploy` against a fresh database.
- Run `prisma generate`.
- Run the API test suite.
- Run smoke checks for auth, subscriptions, payments, notifications, push token registration, ebooks, and announcements.
- Use `prisma migrate diff` to confirm the post-migration database matches `schema.prisma`.
- Confirm no runtime service references a table or column missing from a fresh migrated database.

Recommended implementation order:
This must be first. Do not stabilize payments, notifications, admin modules, or mobile integrations until the database schema can be recreated reliably from migrations.

## 2. Environment Variable Drift

Risk level: Critical

Problem:
Environment examples, CI validation, deploy workflows, Docker compose files, and runtime code disagree on variable names, ports, and URLs. The most serious drift is JWT config: runtime requires access/refresh-specific variables, while examples and validation still use `JWT_SECRET`.

Files affected:
- `.env.example`
- `.env.staging.example`
- `.env.production.example`
- `services/api/.env.example`
- `apps/admin-web/.env.example`
- `apps/mobile-flutter/.env.example`
- `scripts/env/validate-env.mjs`
- `services/api/src/config/security-config.validation.ts`
- `services/api/src/modules/auth/auth.module.ts`
- `services/api/src/modules/auth/auth.service.ts`
- `services/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/admin-web/lib/auth/config.ts`
- `apps/admin-web/lib/realtime/socket-client.ts`
- `apps/mobile-flutter/lib/core/auth/auth_service.dart`
- `apps/mobile-flutter/lib/core/notifications/services/realtime_notifications_service.dart`
- `docker-compose.dev.yml`
- `docker-compose.prod.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/_deploy-reusable.yml`

Estimated effort:
2-4 days.

Dependencies:
- Completion of the migration strategy decision.
- Agreement on canonical local, staging, and production ports.
- Decision on whether admin web should use a dedicated websocket URL or derive it from API base URL.

Implementation plan:
1. Define a single canonical environment contract for API, admin web, mobile, database, Redis, payments, notifications, and observability.
2. Replace legacy JWT variables with:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_ACCESS_EXPIRES_IN`
   - `JWT_REFRESH_EXPIRES_IN`
3. Decide whether `JWT_REFRESH_DAYS` remains or is removed.
4. Align API ports and base URLs across compose, examples, admin defaults, and mobile defaults.
5. Update validation scripts so frontend apps are not forced to provide backend-only variables.
6. Add production/staging validation for `CORS_ORIGIN`, API base URL, websocket URL, and secret strength.
7. Ensure `.env` files are ignored and secrets are never committed.

Validation steps:
- Run environment validation for API, admin web, staging, and production modes.
- Boot the dev compose stack using only documented env files.
- Confirm API health checks use the correct `/api/v1/health` path.
- Confirm admin web points to the same API and websocket services started by compose.
- Confirm mobile run instructions use `--dart-define=API_BASE_URL=...`.
- Confirm CI no longer validates stale variables.

Recommended implementation order:
Start immediately after migration drift is understood. This is a prerequisite for reliable CI, deployment, mobile testing, and provider integrations.

## 3. Mobile/Backend DTO Mismatches

Risk level: High

Problem:
Mobile and admin clients send payloads and call endpoints that do not consistently match the backend controllers and DTOs. This causes working UI flows to fail against the real API.

Files affected:
- `apps/mobile-flutter/lib/core/subscriptions/subscription_service.dart`
- `apps/mobile-flutter/lib/core/notifications/services/notifications_service.dart`
- `apps/mobile-flutter/lib/core/ebooks/ebook_service.dart`
- `apps/mobile-flutter/lib/core/auth/auth_service.dart`
- `apps/mobile-flutter/lib/core/notifications/models/notification_model.dart`
- `apps/admin-web/lib/announcements/api-client.ts`
- `apps/admin-web/lib/announcements/types.ts`
- `apps/admin-web/lib/notifications/api-client.ts`
- `apps/admin-web/lib/auth/http-client.ts`
- `services/api/src/modules/subscriptions/dto/subscribe.dto.ts`
- `services/api/src/modules/notifications/dto/mark-notification-read.dto.ts`
- `services/api/src/modules/notifications/dto/list-notifications-query.dto.ts`
- `services/api/src/modules/announcements/announcements.controller.ts`
- `services/api/src/modules/announcements/dto/create-announcement.dto.ts`

Estimated effort:
2-5 days.

Dependencies:
- Environment URL alignment.
- Stable database migrations.
- Decision on whether backend DTOs or client payloads are the canonical contract.

Implementation plan:
1. Create an endpoint contract matrix for mobile, admin web, and backend.
2. Fix subscription payload mismatch: mobile sends `plan`, backend expects `planCode`.
3. Fix notification read-state mismatch: mobile sends `readState`, backend expects `isRead`.
4. Fix notification query mismatch: use backend-supported `isRead`, `limit`, and `offset`.
5. Fix admin announcement route mismatch: backend admin routes are under `/announcements/admin`.
6. Fix admin announcement body mismatch: backend expects `content`, while admin sends `body`.
7. Normalize response shapes where clients expect `data`, `items`, or flat objects.
8. Introduce shared contract tests or generated API types after the immediate mismatches are fixed.

Validation steps:
- Run backend tests.
- Add API contract tests for auth, subscriptions, notifications, announcements, and ebooks.
- Run Flutter widget/service tests with mocked matching API payloads.
- Run admin type-check and build.
- Manually smoke test login, subscription status, notification list/read-state, and announcement publish against local API.

Recommended implementation order:
Perform after environment stabilization and before payment or notification completion. Payment and notification flows depend on the same client/API contract discipline.

## 4. Security Gaps and RBAC Coverage

Risk level: Critical

Problem:
Several routes are under-protected, payment-sensitive paths are not secured correctly, admin token storage has XSS exposure, metrics are public, and route-level RBAC coverage is inconsistent.

Files affected:
- `services/api/src/modules/users/users.controller.ts`
- `services/api/src/modules/users/users.service.ts`
- `services/api/src/modules/clips/clips.controller.ts`
- `services/api/src/modules/clips/clips.service.ts`
- `services/api/src/modules/policies/policies.controller.ts`
- `services/api/src/modules/policies/policies.service.ts`
- `services/api/src/modules/programs/programs.controller.ts`
- `services/api/src/modules/mentorship/mentorship.controller.ts`
- `services/api/src/modules/payments/payments.controller.ts`
- `services/api/src/modules/payments/payments.service.ts`
- `services/api/src/modules/auth/strategies/jwt.strategy.ts`
- `services/api/src/modules/auth/guards/roles.guard.ts`
- `services/api/src/observability/metrics.controller.ts`
- `services/api/src/main.ts`
- `apps/admin-web/lib/auth/token-storage.ts`
- `apps/admin-web/providers/auth-provider.tsx`
- `apps/admin-web/middleware.ts`
- `apps/admin-web/components/protected-module.tsx`
- `apps/admin-web/app/(protected)/**/page.tsx`
- `.gitignore`
- `.github/workflows/ci.yml`

Estimated effort:
4-8 days.

Dependencies:
- API contract matrix.
- Environment validation cleanup.
- Decision on admin auth storage strategy.

Implementation plan:
1. Add a route security matrix for every controller.
2. Require explicit auth/RBAC on all mutating routes.
3. Fix unauthenticated or weakly authenticated content routes.
4. Fix users module authorization and ownership checks.
5. Revalidate JWT payloads against database state where needed for deleted users, role changes, or disabled accounts.
6. Protect or network-restrict `/metrics`.
7. Remove debug logs that expose login responses or token state.
8. Ensure `.env`, generated dependencies, and build artifacts are ignored.
9. Add CI checks for route guard/decorator coverage.
10. Decide whether admin tokens remain in browser storage or move to a safer cookie/session pattern.

Validation steps:
- Add route-level RBAC tests for anonymous, user, moderator, admin, and super admin.
- Run negative tests for clips, policies, users, payments, admin announcements, notifications, and analytics.
- Confirm metrics access policy in local and production-like modes.
- Run dependency audits for API and admin.
- Run secret scanning.
- Confirm debug logs no longer include login response/token metadata.

Recommended implementation order:
Do this before real payment and notification launch. Payment and notification channels amplify security bugs.

## 5. Payment Integration Completion

Risk level: Critical

Problem:
Payment data models and webhook reconciliation exist, but provider integrations are not production-real. Webhooks are currently behind admin JWT, signature checks are stubs, checkout initiation is missing, and purchases can be recorded without verified payment.

Files affected:
- `services/api/src/modules/payments/payments.controller.ts`
- `services/api/src/modules/payments/payments.service.ts`
- `services/api/src/modules/payments/dto/payment-webhook.dto.ts`
- `services/api/src/modules/payments/providers/paystack.provider.ts`
- `services/api/src/modules/payments/providers/flutterwave.provider.ts`
- `services/api/src/modules/payments/providers/stripe.provider.ts`
- `services/api/src/modules/payments/providers/payment-provider.registry.ts`
- `services/api/src/modules/subscriptions/subscriptions.service.ts`
- `services/api/src/modules/ebooks/ebooks.service.ts`
- `services/api/prisma/schema.prisma`
- `apps/mobile-flutter/lib/core/subscriptions/subscription_service.dart`
- `apps/mobile-flutter/lib/core/ebooks/ebook_service.dart`
- `apps/mobile-flutter/lib/screens/subscription_screen.dart`
- `apps/mobile-flutter/lib/screens/ebook_details_screen.dart`
- `apps/admin-web/app/(protected)/payments/page.tsx`
- `apps/admin-web/lib/**`
- `.env.example`
- `.env.production.example`
- `services/api/.env.example`

Estimated effort:
7-14 days.

Dependencies:
- Stable migrations for payment tables.
- Environment variable cleanup for provider keys and webhook secrets.
- RBAC/security cleanup.
- Product decision on supported providers for first release.

Implementation plan:
1. Pick first production provider order, preferably one provider before all three.
2. Create payment initiation endpoints for subscriptions and eBook purchases.
3. Replace admin-protected webhook route with public provider-specific webhook endpoints secured by provider signatures.
4. Implement real signature verification using provider webhook secrets.
5. Make webhook handling idempotent at the database level.
6. Reconcile payment success/failure into subscription and purchase entitlements.
7. Block eBook purchase completion unless payment is verified.
8. Add retry/recovery handling for failed subscription renewals.
9. Add admin payment monitoring UI after backend correctness is proven.
10. Add mobile payment flow for the selected provider.

Validation steps:
- Unit test each provider signature verifier with valid and invalid signatures.
- Integration test payment initiation.
- Integration test webhook success, failure, duplicate, missing reference, invalid signature, and unknown transaction.
- Confirm eBook purchase cannot be completed without verified payment.
- Confirm subscription status changes only after payment confirmation.
- Run admin payment report smoke tests.
- Run mobile checkout smoke tests in provider sandbox.

Recommended implementation order:
Begin only after schema, env, DTO, and RBAC stabilization. Implement one provider end to end before expanding to multiple providers.

## 6. Notification Completion: Firebase Messaging and Socket.IO

Risk level: High

Problem:
In-app notifications exist, but push and realtime are incomplete. FCM send is simulated, email is mock-only, Flutter does not use Firebase Messaging, and mobile realtime is polling rather than Socket.IO.

Files affected:
- `services/api/src/modules/notifications/notifications.controller.ts`
- `services/api/src/modules/notifications/notifications.service.ts`
- `services/api/src/modules/push/push.controller.ts`
- `services/api/src/modules/push/push.service.ts`
- `services/api/src/modules/push/push.providers/fcm.provider.ts`
- `services/api/src/modules/email/email.module.ts`
- `services/api/src/modules/email/email.service.ts`
- `services/api/src/modules/email/mock-smtp.provider.ts`
- `services/api/src/modules/realtime/realtime.gateway.ts`
- `services/api/src/modules/realtime/realtime.service.ts`
- `services/api/src/modules/announcements/announcements.service.ts`
- `apps/mobile-flutter/pubspec.yaml`
- `apps/mobile-flutter/android/app/build.gradle.kts`
- `apps/mobile-flutter/android/app/src/main/AndroidManifest.xml`
- `apps/mobile-flutter/ios/Runner/Info.plist`
- `apps/mobile-flutter/lib/core/notifications/**`
- `apps/mobile-flutter/lib/screens/notifications_screen.dart`
- `apps/admin-web/lib/realtime/socket-client.ts`
- `apps/admin-web/lib/notifications/**`
- `.env.example`
- `.env.production.example`
- `services/api/.env.example`

Estimated effort:
7-12 days.

Dependencies:
- Stable push and notification tables from migrations.
- Environment variable cleanup.
- RBAC/security cleanup.
- Firebase project credentials and mobile app config files.

Implementation plan:
1. Replace simulated FCM provider with Firebase Admin SDK.
2. Add secure handling for Firebase credentials.
3. Wire mobile Firebase Messaging dependencies and platform config.
4. Implement mobile token registration, refresh, and revoke flows.
5. Replace mobile realtime polling with Socket.IO client support.
6. Add notification deep links, especially announcement detail links.
7. Trigger push delivery from announcement publish flows with idempotency.
8. Add retry processing for retryable push failures.
9. Decide whether email remains out of scope or replace mock SMTP with a production provider.
10. Add admin notification delivery reporting after backend delivery logs are reliable.

Validation steps:
- Unit test FCM success/failure mapping.
- Integration test device token register/refresh/revoke/list.
- Integration test announcement publish triggers in-app notification and push delivery once.
- Test duplicate publish/delivery idempotency.
- Test Flutter foreground/background/terminated message handling.
- Test Socket.IO reconnect and authenticated event delivery.
- Test invalid/expired realtime tokens.
- Confirm delivery logs accurately record success and failure.

Recommended implementation order:
Start after payment security decisions if payments send receipts or payment notifications. Otherwise, it can run in parallel with admin placeholder work once schema/env/RBAC are stable.

## 7. Admin Placeholder Modules

Risk level: Medium-High

Problem:
The admin web app presents broad platform management navigation, but many routes are placeholders. This creates operational risk because admins cannot actually manage users, subscriptions, payments, programs, mentorship, clips, policies, content, or ebooks from the UI.

Files affected:
- `apps/admin-web/app/(protected)/users/page.tsx`
- `apps/admin-web/app/(protected)/subscriptions/page.tsx`
- `apps/admin-web/app/(protected)/payments/page.tsx`
- `apps/admin-web/app/(protected)/programs/page.tsx`
- `apps/admin-web/app/(protected)/mentorship/page.tsx`
- `apps/admin-web/app/(protected)/ebooks/page.tsx`
- `apps/admin-web/app/(protected)/content/page.tsx`
- `apps/admin-web/app/(protected)/clips/page.tsx`
- `apps/admin-web/app/(protected)/policies/page.tsx`
- `apps/admin-web/components/module-page.tsx`
- `apps/admin-web/components/protected-module.tsx`
- `apps/admin-web/components/nav-links.ts`
- `apps/admin-web/middleware.ts`
- `apps/admin-web/lib/**`
- `services/api/src/modules/users/**`
- `services/api/src/modules/subscriptions/**`
- `services/api/src/modules/payments/**`
- `services/api/src/modules/programs/**`
- `services/api/src/modules/mentorship/**`
- `services/api/src/modules/clips/**`
- `services/api/src/modules/policies/**`
- `services/api/src/modules/ebooks/**`

Estimated effort:
10-20 days, depending on depth and UX requirements.

Dependencies:
- Stable backend modules.
- Route security matrix.
- API contract definitions.
- Payment and notification stabilization for payment/notification admin screens.

Implementation plan:
1. Remove or clearly label placeholder modules until backed by real APIs.
2. Complete backend service implementations before building admin UI.
3. Implement admin modules in this sequence:
   - users and roles
   - subscriptions and plans
   - payments and reconciliation
   - ebooks and library content
   - clips and policies
   - programs and mentorship
4. Enforce middleware and component-level RBAC consistently.
5. Add loading/error/empty states and optimistic updates only after contract tests pass.
6. Add admin smoke tests for critical flows.

Validation steps:
- Run admin type-check, lint, and build.
- Add page-level smoke tests for every protected route.
- Add API integration tests for each backend module before wiring UI.
- Test direct URL access for each role.
- Test create/update/delete flows with invalid and unauthorized users.
- Confirm placeholder text is removed or intentionally retained only for deferred modules.

Recommended implementation order:
Do this last among the foundation priorities. Admin modules should consume stabilized backend APIs rather than driving schema or contract churn.

## Cross-Cutting Validation Gates

Before declaring stabilization complete, the project should pass these gates:

1. Fresh database gate:
   - `prisma migrate deploy` creates a database that matches `schema.prisma`.
   - Seed runs without drift.

2. Environment gate:
   - API, admin, mobile, staging, and production env examples match runtime requirements.
   - CI validates the current variable contract.

3. Contract gate:
   - Mobile and admin clients match backend DTOs and response shapes.
   - Critical endpoints have contract tests.

4. Security gate:
   - All sensitive routes have explicit auth and RBAC coverage.
   - Payment webhooks use real provider signatures.
   - Secrets and local env files are ignored and scanned.

5. Integration gate:
   - Payment sandbox flow works end to end.
   - Firebase push works end to end.
   - Socket.IO realtime works from admin and mobile clients.

6. Admin gate:
   - Placeholder modules are either completed or hidden from production navigation.
   - Direct route access is role-checked.

## Suggested Milestones

Milestone 1: Schema and config stability
- Complete Prisma migration reconciliation.
- Complete environment variable alignment.
- Add fresh-db and env CI checks.

Milestone 2: Contract and security baseline
- Fix mobile/admin DTO mismatches.
- Add route-security matrix.
- Close obvious RBAC gaps.
- Remove debug auth logging and harden metrics/secrets handling.

Milestone 3: Money path
- Implement one payment provider end to end.
- Secure webhooks.
- Connect verified payments to subscriptions and eBook entitlements.

Milestone 4: Notification path
- Implement Firebase Admin FCM.
- Implement Flutter Firebase Messaging.
- Replace mobile polling with Socket.IO.
- Add push retry/idempotency validation.

Milestone 5: Admin operational readiness
- Replace placeholder admin modules in priority order.
- Add admin smoke tests.
- Hide anything not production-ready.

## Final Recommendation

Do not add new product features until Milestones 1 and 2 are complete. Do not launch paid subscriptions, eBook purchases, or push notifications until Milestones 3 and 4 pass sandbox and integration validation. Treat Milestone 5 as the line between a backend-capable platform and an operational admin product.
