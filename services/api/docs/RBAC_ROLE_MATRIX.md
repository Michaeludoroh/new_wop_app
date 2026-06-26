# RBAC Role Matrix

This document defines the intentional role requirements for each admin module. The backend uses hierarchical role checks (`RolesGuard`): higher roles satisfy lower requirements.

## Roles (ascending privilege)

| Role | Level | Typical use |
|------|-------|-------------|
| `USER` | 1 | Mobile app members |
| `MODERATOR` | 2 | Content editors, program/mentorship managers |
| `ADMIN` | 3 | Operations, subscriptions, user management |
| `SUPER_ADMIN` | 4 | Full platform control |

## Module requirements

| Module | Minimum `@Roles` | Rationale |
|--------|------------------|-----------|
| Announcements admin | `ADMIN` | Broadcast communications — admin-only |
| Users admin | `ADMIN` | PII and role assignment |
| Subscriptions admin | `ADMIN` | Billing and entitlements |
| Payments webhooks | Public (signed) | Provider callbacks |
| Events admin | `MODERATOR` | Community event management |
| Clips admin | `MODERATOR` | Media content management |
| Programs admin | `MODERATOR` | Empowerment program management |
| Mentorship admin | `MODERATOR` | Class and session management |
| eBooks admin | `ADMIN`, `MODERATOR` | Digital library management |
| Notifications create | `ADMIN` | Push/email broadcast |
| Notifications read | `USER`+ | All authenticated users |

## Admin-web route map

See `apps/admin-web/middleware.ts` `ROLE_ROUTE_MAP` — must stay aligned with backend `@Roles` decorators.

## Change policy

When adding a new admin module, choose the lowest role that should manage it and document the choice here before merging.
