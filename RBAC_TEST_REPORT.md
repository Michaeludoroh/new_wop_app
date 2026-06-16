# RBAC Test Report

## Summary

Milestone 2 adds automated coverage for route security metadata, ownership behavior, and key security-sensitive guards.

## Tests Added

| Test file | Coverage |
|---|---|
| `services/api/src/security/route-security.spec.ts` | Verifies auth + RBAC guards and role metadata on protected controllers/routes. |
| `services/api/src/modules/users/users.service.spec.ts` | Verifies ownership checks for profile read/update paths. |
| `services/api/src/modules/auth/strategies/jwt.strategy.spec.ts` | Verifies JWT payload is checked against active database user state. |
| `services/api/src/observability/metrics.controller.spec.ts` | Verifies metrics token behavior in development, staging, and production-like environments. |
| `services/api/src/contracts/api-contract.spec.ts` | Verifies canonical DTOs for subscription, notifications, and announcements. |

## RBAC Matrix

| Area | Route(s) | Anonymous | USER | MODERATOR | ADMIN | SUPER_ADMIN | Status |
|---|---|---:|---:|---:|---:|---:|---|
| Auth public | register/login/refresh/forgot/reset | Allowed | Allowed | Allowed | Allowed | Allowed | Public by design |
| Auth me | `GET /auth/me` | Denied | Allowed | Allowed | Allowed | Allowed | Guarded |
| Users list | `GET /users` | Denied | Denied | Denied | Allowed | Allowed | Guard + role |
| User profile read | `GET /users/:id` | Denied | Own only | Own/elevated by hierarchy | Any | Any | Guard + ownership |
| User profile update | `PATCH /users/:id/profile` | Denied | Own only | Own/elevated by hierarchy | Any | Any | Guard + ownership |
| Clips public read | `GET /clips/public`, `GET /clips/public/featured`, `GET /clips/public/:id` | Allowed | Allowed | Allowed | Allowed | Allowed | Public published catalog |
| Clips admin management | `/clips/admin*` | Denied | Denied | Allowed | Allowed | Allowed | Guard + role |
| Policies read | `GET /policies`, `GET /policies/:id` | Denied | Allowed | Allowed | Allowed | Allowed | Guarded |
| Policies create | `POST /policies` | Denied | Denied | Allowed | Allowed | Allowed | Guard + role |
| Programs create | `POST /programs` | Denied | Denied | Allowed | Allowed | Allowed | Guard + role |
| Mentorship create | `POST /mentorship` | Denied | Denied | Allowed | Allowed | Allowed | Guard + role |
| Announcements public | `GET /announcements/public*` | Allowed | Allowed | Allowed | Allowed | Allowed | Public read |
| Announcements admin | `/announcements/admin*` mutating/admin reads | Denied | Denied | Denied | Allowed | Allowed | Guard + role |
| Notifications read | `GET /notifications*` | Denied | Allowed | Denied currently | Allowed | Allowed | Existing contract |
| Notifications admin create | `POST /notifications/broadcast`, `POST /notifications/targeted` | Denied | Denied | Denied | Allowed | Allowed | Guard + role |
| Analytics | `GET /analytics/*` | Denied | Denied | Denied | Allowed | Allowed | Guard + role |
| Payments history | `GET /payments/history` | Denied | Own history | By hierarchy | Any allowed by service | Any allowed by service | Guard + service logic |
| Payments webhook | `POST /payments/webhook` | Denied | Denied | Denied | Allowed | Allowed | Temporary admin-only, Milestone 3 replacement needed |
| Metrics | `GET /metrics` | Dev only if no token; token required in staging/prod | N/A | N/A | N/A | N/A | Token-gated |

## Validation Commands

Expected backend validation:

```bash
cd services/api
npm run test -- --runInBand
```

Expected admin validation:

```bash
cd apps/admin-web
npm run type-check
npm run build
```

Expected Flutter validation:

```bash
cd apps/mobile-flutter
flutter test
```

## Current Validation Status

The tests were added and touched files show no IDE linter errors.

Command validation was attempted through a shell subagent, but the execution environment returned no exit status and no output for every command, including a minimal shell health check. The following commands are therefore unverified locally:

- `services/api`: `npm run test -- --runInBand`
- `apps/admin-web`: `npm run type-check`
- `apps/admin-web`: `npm run build`
- `apps/mobile-flutter`: `flutter test`

These should be run in CI or a stable local shell before merging.

## Residual RBAC Work

- Replace admin-JWT payment webhook with provider-signature webhook routes in Milestone 3.
- Add end-to-end unauthorized/role tests once an integration test database is consistently available.
- Revisit whether notification read routes should include `MODERATOR`; current backend contract allows user/admin/super-admin.
