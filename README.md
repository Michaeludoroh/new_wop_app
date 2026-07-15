# WOPP Monorepo

**WOPP** — The official app of **Men and Women of Passion and Purpose**.

Website: [https://woppandmopp.com](https://woppandmopp.com)

Cross-platform product stack:

- **Mobile App (WOPP)**: Flutter (Android/iOS)
- **Admin Dashboard**: Next.js
- **Backend API**: NestJS + Prisma + PostgreSQL
- **Queue/Cache**: Redis
- **Auth/Push**: Firebase Auth + FCM (integration-ready)
- **Payments**: Native mobile IAP + Flutterwave website checkout

## Repository Structure

- `apps/mobile-flutter` - Flutter mobile app
- `apps/admin-web` - Next.js admin dashboard
- `services/api` - NestJS backend API
- `packages/shared-types` - Shared contracts/types
- `infra` - Docker and infrastructure config
- `docs` - Architecture and product docs

## Quick Start

### 1) Install dependencies

- API:
  - `cd services/api`
  - `npm install`

- Admin web:
  - `cd apps/admin-web`
  - `npm install`

- Flutter mobile:
  - `cd apps/mobile-flutter`
  - `flutter pub get`

### 2) Set environment variables

Copy each template and fill values for your local/dev setup:

- Root: `.env.example` -> `.env` (optional root defaults)
- API: `services/api/.env.example` -> `services/api/.env`
- Admin web: `apps/admin-web/.env.example` -> `apps/admin-web/.env.local`
- Flutter mobile: `apps/mobile-flutter/.env.example` -> your chosen runtime env file strategy

### 3) Start infrastructure (optional but recommended)

From repository root:
- `docker compose -f infra/docker-compose.yml up -d`

This starts PostgreSQL and Redis containers used by the API.

### 4) Run services

- API (NestJS):
  - `cd services/api`
  - `npm run start:dev`
  - API base URL: `http://localhost:4000/api/v1`

- Admin web (Next.js):
  - `cd apps/admin-web`
  - `npm run dev`
  - Admin URL: `http://localhost:3001`

- Flutter mobile:
  - `cd apps/mobile-flutter`
  - `flutter run`

### 5) Build commands

- API: `cd services/api && npm run build`
- Admin web: `cd apps/admin-web && npm run build`

On PowerShell-restricted systems, use:
- `cmd /c npm run build`

### Shared contracts package

Shared API contracts/types are available at:
- `packages/shared-types`

TypeScript import alias configured for API and admin web:
- `@ministry/shared-types`
- `@ministry/shared-types/*`

## Core Product Modules

1. Subscription-based access
2. Announcements
3. Clips as the primary ministry content experience
4. Media Library (eBooks)
5. Group Policy
6. Empowerment Programs
7. Mentorship Class
8. Admin Dashboard
9. Additional features (auth, notifications, dark mode, offline, search)
10. Ongoing maintenance model

## Security and Scalability Focus

- JWT and role-based access controls
- Verified payment webhooks
- Signed URLs for protected media
- Audit logging for admin actions
- Horizontal scalability via stateless API services
- Managed PostgreSQL + Redis patterns

See `docs/architecture.md` for details.
