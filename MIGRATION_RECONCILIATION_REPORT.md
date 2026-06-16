# Migration Reconciliation Report

## Summary

Milestone 1 adds an official Prisma reconciliation migration so the migration chain can create the tables, enums, columns, indexes, and constraints required by the current runtime services.

New migration:

- `services/api/prisma/migrations/20260610191000_reconcile_platform_schema/migration.sql`

The migration folds the platform schema changes that were previously only represented by `schema.prisma` and ad-hoc `tmp-hardening/*.sql` scripts into the official Prisma migration history.

## Drift Identified

The existing migration history created an early schema with legacy tables and omitted several models now required by runtime services.

Missing or drifted runtime objects:

- `UserSubscription`
- `PaymentTransaction`
- `PaymentWebhookEvent`
- `PushDeviceToken`
- `PushDeliveryLog`
- `BillingInterval`
- `TransactionType`
- `WebhookProcessingStatus`
- `AnnouncementCategory`
- `PushPlatform`
- `PushCategory`
- `PushProvider`
- `PushDeliveryStatus`
- `PaymentProvider.STRIPE`
- `SubscriptionPlan.billingInterval`
- `SubscriptionPlan.trialPeriodDays`
- `SubscriptionPlan.recurringEnabled`
- `SubscriptionPlan.metadata`
- `Announcement.imageUrl`
- `Announcement.category`
- `Announcement.isPublished`
- `Announcement.pushNotificationSent`
- `Notification.announcementId`

Legacy objects no longer represented by `schema.prisma`:

- `Payment`
- `Subscription`
- `SubscriptionInterval`

## Migration Strategy

The reconciliation migration is designed to make the official migration chain match `schema.prisma` without depending on `tmp-hardening` scripts during normal deployments.

Key decisions:

- Add missing enums through guarded `DO` blocks.
- Add `PaymentProvider.STRIPE` if absent.
- Align `SubscriptionPlan` by adding `billingInterval`, copying values from legacy `interval`, then removing the old column and enum.
- Add missing announcement and notification columns.
- Create current payment, subscription, webhook, push token, and push delivery tables.
- Preserve legacy `Subscription` rows into `UserSubscription` where present.
- Preserve legacy `Payment` rows into `PaymentTransaction` where present.
- Drop legacy `Payment` and `Subscription` after preservation.
- Add all Prisma-declared indexes and foreign keys needed by the current schema.

## Files Changed

- `services/api/prisma/migrations/20260610191000_reconcile_platform_schema/migration.sql`
- `services/api/package.json`
- `scripts/prisma/validate-schema-diff.mjs`
- `scripts/deploy/run-migrations.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/api-ci.yml`
- `.github/workflows/_deploy-reusable.yml`

## Rollback Strategy

Before this migration is applied to shared environments:

1. Remove `services/api/prisma/migrations/20260610191000_reconcile_platform_schema`.
2. Re-run migration validation against a disposable database.
3. Keep using the previous migration chain.

After this migration is applied to shared environments:

1. Restore from database backup if rollback must undo schema changes.
2. If only application rollback is needed, keep the migration applied and deploy the previous application image if it remains compatible.
3. Do not manually delete rows from `_prisma_migrations` unless rebuilding the environment from scratch.

The migration preserves legacy `Payment` and `Subscription` data into the new tables before dropping the legacy tables, but a production rollout should still be preceded by a backup and a staging dry run.

## Validation Gates Added

New script:

- `scripts/prisma/validate-schema-diff.mjs`

API package scripts:

- `npm run prisma:migrate:deploy`
- `npm run prisma:validate`

CI updates:

- API CI now starts a disposable PostgreSQL service.
- API CI runs environment validation.
- API CI runs Prisma generate.
- API CI runs `npm run prisma:validate`, which:
  - runs `prisma migrate deploy`
  - runs `prisma generate`
  - runs `prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --exit-code`

Deployment update:

- `scripts/deploy/run-migrations.mjs` now verifies the deployed database against `schema.prisma` after migration deploy.
- Reusable deployment workflow now uses `scripts/prisma/validate-schema-diff.mjs`.

## Validation Required

Required commands:

```bash
cd services/api
npm run prisma:migrate:deploy
npm run prisma:generate
npm run prisma:validate
npm run test -- --runInBand
```

For a destructive local reset, use only a disposable database:

```bash
cd services/api
npx prisma migrate reset --force --skip-seed
npm run prisma:validate
```

## Current Validation Status

Validation attempted after implementation:

- `node scripts/env/validate-env.mjs --check-templates`: passed.
- `npm run env:validate` from `services/api`: passed with the standardized JWT access/refresh contract.
- `npm run prisma:generate` from `services/api`: passed.
- `npm run test -- --runInBand` from `services/api`: passed.
- `npm run prisma:validate` from `services/api`: failed during `prisma migrate deploy`.

The migration validation failure could not be cleanly classified from local output because the Windows command runner emitted stream capture errors that obscured Prisma stderr. CI now runs the same gate against a disposable PostgreSQL service, which should provide a reliable pass/fail signal.

Pending validation:

- `prisma migrate reset` against a guaranteed disposable database.
- `prisma migrate deploy` with clear Prisma stderr.
- schema diff verification after successful deploy.

## Remaining Notes

- `tmp-hardening/*.sql` is no longer needed for normal fresh deployments after this migration, but the directory was not deleted because it may contain historical evidence from prior hardening runs.
- Existing environments that have manually applied subsets of `tmp-hardening` should be validated in staging before production deploy.
- Fresh environments should rely on Prisma migrations only.
