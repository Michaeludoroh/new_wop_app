# Security Review Report

## Scope

Milestone 2 focused on API contract correctness and route-security hardening. This report covers the changes made and residual risks that remain outside this milestone.

## Changes Implemented

### JWT Validation

`JwtStrategy` now validates more than token shape:

- Requires `sub` and `role`.
- Rejects invalid role values.
- Loads the user from the database.
- Rejects missing or soft-deleted users.
- Rejects tokens whose role no longer matches the database.

Affected file:

- `services/api/src/modules/auth/strategies/jwt.strategy.ts`

### Users Route Security

The users module now has explicit RBAC and ownership checks:

- `GET /users`: admin-or-higher only through hierarchical `RolesGuard`.
- `GET /users/:id`: authenticated users may read themselves; admins may read others.
- `PATCH /users/:id/profile`: authenticated users may update themselves; admins may update others.
- Profile update only accepts safe profile fields currently implemented by the service.
- Password hashes are not returned.

Affected files:

- `services/api/src/modules/users/users.controller.ts`
- `services/api/src/modules/users/users.service.ts`

### Content Route Security

Clips now uses a public/admin split: published public catalog routes are intentionally anonymous, while admin reads and mutations are protected.

- `policies`

Content creation for managed modules now requires moderator-or-higher through hierarchical RBAC:

- `/clips/admin*`
- `POST /policies`
- `POST /programs`
- `POST /mentorship`

Affected files:

- `services/api/src/modules/clips/clips.controller.ts`
- `services/api/src/modules/policies/policies.controller.ts`
- `services/api/src/modules/programs/programs.controller.ts`
- `services/api/src/modules/mentorship/mentorship.controller.ts`

### Metrics Exposure

`/metrics` now supports token protection:

- Development without `METRICS_AUTH_TOKEN`: allowed for local development.
- Staging/production: requires `METRICS_AUTH_TOKEN`.
- Token may be supplied as `Authorization: Bearer <token>` or `x-metrics-token`.

Affected files:

- `services/api/src/observability/metrics.controller.ts`
- `.env.example`
- `.env.staging.example`
- `.env.production.example`
- `services/api/.env.example`

### Admin Auth Low-Risk Hardening

Current approach:

- Access token, refresh token, and user are stored in `localStorage`.
- Mirror cookies are set for middleware routing.
- Cookies are JavaScript-readable and not `HttpOnly`.

Changes implemented:

- Removed login response/token-adjacent debug logs.
- Fixed storage event key from `ministry_access_token` to `ministry_admin_access_token`.
- Added `Secure` cookie attribute automatically when served over HTTPS.

Affected files:

- `apps/admin-web/lib/auth/api-client.ts`
- `apps/admin-web/providers/auth-provider.tsx`
- `apps/admin-web/lib/auth/token-storage.ts`

Recommended production approach:

- Move refresh token storage to `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict` cookies managed by a server-side session layer or BFF.
- Keep access tokens short-lived.
- Avoid persisting access tokens in `localStorage`.
- Add CSRF protections if cookie-authenticated mutation requests are introduced.

This larger change was not implemented because it would alter login/session architecture and risks breaking the existing admin flow.

## Admin Route Hardening

Admin middleware and placeholder pages were aligned:

- `/content`, `/clips`, and `/policies` now have middleware role restrictions.
- Placeholder pages now use `ProtectedModule`.
- `/announcements` is admin/super-admin only to match backend admin announcement routes.

Affected files:

- `apps/admin-web/middleware.ts`
- `apps/admin-web/components/nav-links.ts`
- `apps/admin-web/app/(protected)/content/page.tsx`
- `apps/admin-web/app/(protected)/clips/page.tsx`
- `apps/admin-web/app/(protected)/policies/page.tsx`
- `apps/admin-web/app/(protected)/announcements/page.tsx`

## Automated Security Tests Added

- DTO contract tests: `services/api/src/contracts/api-contract.spec.ts`
- Route security metadata tests: `services/api/src/security/route-security.spec.ts`
- JWT state validation tests: `services/api/src/modules/auth/strategies/jwt.strategy.spec.ts`
- User ownership tests: `services/api/src/modules/users/users.service.spec.ts`
- Metrics token tests: `services/api/src/observability/metrics.controller.spec.ts`

## Residual Risks

High:

- Payment webhook security remains incomplete. `/payments/webhook` is still admin-JWT protected and provider signature verification remains Milestone 3 work.
- EBook purchase can still create purchase records without verified payment.
- EBook stream tokens remain unsigned.

Medium:

- Admin tokens remain in browser storage.
- Some backend domain modules remain scaffolded.
- Push/email providers remain simulated or mock-only.

Low:

- Metrics token support is present, but deployment must provide `METRICS_AUTH_TOKEN` in staging/production.

## Recommendation

Milestone 2 materially improves route security and contract alignment, but paid flows should remain disabled until Milestone 3 completes real provider webhook verification, checkout initiation, and entitlement enforcement.
