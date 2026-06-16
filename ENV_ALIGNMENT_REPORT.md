# Environment Alignment Report

## Summary

Milestone 1 standardizes the environment contract around explicit access and refresh JWT settings and separates API, admin web, and mobile validation requirements.

Standard JWT variables:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Obsolete variables:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`

The validation script now rejects obsolete JWT variables for API, admin web, and mobile targets.

## Files Changed

Environment templates:

- `.env.example`
- `.env.staging.example`
- `.env.production.example`
- `services/api/.env.example`
- `apps/admin-web/.env.example`
- `apps/mobile-flutter/.env.example`

Validation scripts:

- `scripts/env/validate-env.mjs`
- `scripts/prisma/validate-schema-diff.mjs`
- `scripts/deploy/run-migrations.mjs`

Runtime configuration defaults:

- `apps/admin-web/lib/auth/config.ts`
- `apps/mobile-flutter/lib/core/auth/auth_service.dart`
- `apps/mobile-flutter/lib/core/notifications/services/realtime_notifications_service.dart`

Docker and CI/CD:

- `docker-compose.prod.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/api-ci.yml`
- `.github/workflows/admin-web-ci.yml`
- `.github/workflows/mobile-flutter-ci.yml`
- `.github/workflows/_deploy-reusable.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

Repository hygiene:

- `.gitignore`

## Contract by Target

### API

Required:

- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Required in staging and production:

- `CORS_ORIGIN`

Optional booleans:

- `REDIS_ADAPTER_ENABLED`
- `WEBSOCKET_ONLY_MODE`

### Admin Web

Required:

- `NODE_ENV`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_WEBSOCKET_URL`

Optional booleans:

- `NEXT_PUBLIC_DEBUG_AUTH_GATE`

### Mobile

Required:

- `APP_ENV`
- `API_BASE_URL`

## Local Defaults

Aligned local defaults:

- API: `http://localhost:4000/api/v1`
- Android emulator API: `http://10.0.2.2:4000/api/v1`
- Admin web: `http://localhost:4000/api/v1`
- WebSocket service: `http://localhost:4100`

Production compose health checks now use:

- `http://127.0.0.1:4000/api/v1/health`
- `http://127.0.0.1:4100/api/v1/health`

## Validation Gates Added

Environment validation:

```bash
node scripts/env/validate-env.mjs --target=api
node scripts/env/validate-env.mjs --target=admin-web
node scripts/env/validate-env.mjs --target=mobile
node scripts/env/validate-env.mjs --check-templates
```

Target inference:

- Running from `services/api` validates API env.
- Running from `apps/admin-web` validates admin web env.
- Running from `apps/mobile-flutter` validates mobile env.
- Running from root defaults to API unless `--target` is supplied.

CI updates:

- Monorepo CI validates API env, admin env, template contracts, Prisma generate, migration deploy, and deployed-schema diff.
- API CI validates API env, template contracts, Prisma generate, migration deploy, and deployed-schema diff.
- Admin web CI validates admin web env.
- Mobile Flutter CI validates mobile env.
- Deploy workflows require separate access and refresh JWT secrets.

## Deployment Secret Changes

Staging:

- `STAGING_JWT_ACCESS_SECRET`
- `STAGING_JWT_REFRESH_SECRET`

Production:

- `PRODUCTION_JWT_ACCESS_SECRET`
- `PRODUCTION_JWT_REFRESH_SECRET`

Reusable deploy workflow secrets:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## Repository Hygiene

`.gitignore` now ignores:

- `.env`
- `.env.*`
- `node_modules`
- `.next`
- `dist`
- build artifacts

Environment examples remain explicitly allowed.

## Validation Required

Required checks:

```bash
node scripts/env/validate-env.mjs --check-templates

cd services/api
npm run env:validate
npm run prisma:generate
npm run prisma:validate
npm run test -- --runInBand

cd ../../apps/admin-web
npm run env:validate
npm run type-check
npm run build

cd ../mobile-flutter
node ../../scripts/env/validate-env.mjs --target=mobile
flutter analyze
flutter test
```

## Current Validation Status

Validation attempted after implementation:

- `node scripts/env/validate-env.mjs --check-templates`: passed.
- `npm run env:validate` from `services/api`: passed.
- `npm run prisma:generate` from `services/api`: passed.
- `npm run test -- --runInBand` from `services/api`: passed.

Additional static checks:

- All env example files are free of obsolete `JWT_SECRET` and `JWT_EXPIRES_IN` entries.
- Edited scripts/config files show no IDE linter errors.

Pending validation:

- admin env validation in CI or a working local admin install.
- mobile env validation in CI or a working local Flutter environment.
- Prisma migrate deploy and schema diff after a disposable PostgreSQL target is available with clear stderr capture.

## Remaining Notes

- Local untracked or previously tracked `.env` files may still exist on developer machines. They should be rotated if they contained real secrets.
- Existing Git history may already contain generated artifacts or env files; `.gitignore` prevents future additions but does not remove tracked files by itself.
- Payment and Firebase provider variables remain placeholders until Milestones 3 and 4.
