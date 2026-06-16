# Payment Test Report

## Automated Tests Added

| Test file | Coverage |
|---|---|
| `services/api/src/modules/payments/payments.service.spec.ts` | Flutterwave webhook signature rejection, duplicate webhook idempotency, subscription activation, amount mismatch rejection, eBook entitlement creation, and pending transaction creation before checkout. |
| `services/api/src/modules/subscriptions/subscriptions.service.spec.ts` | Rejects direct paid subscription activation without checkout. |
| `services/api/src/modules/ebooks/ebooks.service.spec.ts` | Rejects direct eBook purchase without payment, rejects pending payments, and grants entitlement only for matching verified eBook transactions. |

## Required Validation Scenarios

| Scenario | Automated coverage | Manual/sandbox coverage required |
|---|---|---|
| Successful subscription purchase | Covered at webhook/service level | Flutterwave sandbox checkout required |
| Failed payment scenario | Covered for retry/status mapping through webhook service behavior | Flutterwave sandbox failed payment required |
| Duplicate webhook scenario | Covered | Replay real sandbox webhook required |
| Successful eBook purchase | Covered at webhook/service level | Flutterwave sandbox checkout required |
| Invalid signature rejection | Covered | Send real request with invalid `verif-hash` required |
| Sandbox provider validation | Not possible without credentials | Required before production enablement |

## Suggested Commands

Backend:

```bash
cd services/api
npm run test -- --runInBand
```

Admin:

```bash
cd apps/admin-web
npm run type-check
npm run build
```

Flutter:

```bash
cd apps/mobile-flutter
flutter pub get
flutter test
```

Prisma:

```bash
cd services/api
npm run prisma:generate
npm run prisma:migrate:deploy
```

## Current Local Validation Status

IDE lint checks reported no diagnostics for touched files.

Full command validation could not be completed in this Cursor shell environment because shell commands have repeatedly returned no exit status and no output, including previous minimal shell health checks.

Latest attempted validation:

- `services/api`: `npm run test -- --runInBand` returned no output/status.
- `services/api`: `npm run prisma:generate` returned no output/status.
- `apps/admin-web`: `npm run type-check` returned no output/status.
- `apps/admin-web`: `npm run build` returned no output/status.
- `apps/mobile-flutter`: `flutter pub get` returned no output/status.
- `apps/mobile-flutter`: `flutter test` returned no output/status.

Do not treat backend tests, admin build, Flutter tests, or Prisma generate/deploy as locally passed until they run in a stable shell or CI.

## Manual Flutterwave Sandbox Checklist

- Configure `FLUTTERWAVE_SECRET_KEY`.
- Configure `FLUTTERWAVE_WEBHOOK_SECRET`.
- Configure webhook URL: `/api/v1/payments/webhooks/flutterwave`.
- Configure `PAYMENT_REDIRECT_BASE_URL`.
- Start a subscription checkout from mobile.
- Complete payment in Flutterwave sandbox.
- Confirm `PaymentTransaction.status = SUCCESS`.
- Confirm `UserSubscription.status = ACTIVE`.
- Replay the same webhook and confirm no duplicate entitlement.
- Start an eBook checkout from mobile.
- Complete payment in Flutterwave sandbox.
- Confirm `EbookPurchase` exists.
- Attempt premium eBook access before and after entitlement.
- Send a webhook with invalid `verif-hash` and confirm rejection.
