# Payment Implementation Report

## Scope

Milestone 3 completes the first production-real payment path using Flutterwave only. Other provider adapters remain in the repository as inactive scaffolding, but runtime registration and webhook acceptance are limited to Flutterwave.

## Architecture

Payment flow is backend-owned:

1. Authenticated client requests checkout initiation.
2. Backend creates a pending `PaymentTransaction`.
3. Backend calls Flutterwave and returns a hosted checkout URL.
4. Client opens Flutterwave checkout.
5. Flutterwave sends a signed webhook to the backend.
6. Backend verifies the webhook, reconciles the transaction, and grants entitlement.
7. Client polls `/payments/status` and refreshes subscription/library state.

## Backend Changes

### Flutterwave Provider Focus

- `PaymentProviderRegistry` now registers only `FlutterwaveProviderAdapter`.
- `PaymentsModule` only provides the Flutterwave adapter.
- `PaymentWebhookDto` accepts only `FLUTTERWAVE`.

Affected files:

- `services/api/src/modules/payments/payments.module.ts`
- `services/api/src/modules/payments/providers/payment-provider.registry.ts`
- `services/api/src/modules/payments/dto/payment-webhook.dto.ts`

### Checkout Initiation

Implemented backend checkout flows:

- `POST /api/v1/payments/checkout/subscription`
- `POST /api/v1/payments/checkout/ebook`

Both create a pending transaction before returning a Flutterwave checkout URL.

Subscription checkout:

- Creates `UserSubscription` with `PENDING`.
- Creates `PaymentTransaction` with `PENDING`.
- Activates the subscription only after verified webhook success.

eBook checkout:

- Creates `PaymentTransaction` with `PENDING`.
- Uses new `TransactionType.EBOOK_PURCHASE`.
- Creates `EbookPurchase` only after verified webhook success.

### Transaction Lifecycle

Primary lifecycle:

- `PENDING`: created before checkout.
- `SUCCESS`: set only after verified Flutterwave success webhook.
- `FAILED`: set after verified failure webhook or retry exhaustion.
- `REFUNDED`: reserved for future refund processing.

Failed payments remain recoverable through retry metadata:

- `retryable`
- `retryCount`
- `nextRetryAt`
- `failureCode`
- `failureMessage`

### Entitlement Enforcement

Subscriptions:

- Paid subscriptions cannot be directly activated with `/subscriptions/subscribe`.
- Free plans may still use `/subscriptions/subscribe`.
- Paid plans require Flutterwave checkout and verified webhook activation.

eBooks:

- `/ebooks/purchase` now requires a successful verified `EBOOK_PURCHASE` transaction reference.
- Direct purchase without a verified payment reference is rejected.
- Premium eBook access still requires either purchase entitlement or active subscription.

### Admin Visibility

The admin payments page now shows:

- Transaction listing.
- Status, provider, type, amount, retry state, and created timestamp.
- Webhook event listing.
- Signature-valid and processing-state visibility.

Affected files:

- `apps/admin-web/app/(protected)/payments/page.tsx`
- `apps/admin-web/lib/payments/api-client.ts`
- `apps/admin-web/lib/payments/hooks.ts`
- `apps/admin-web/lib/payments/types.ts`

## Mobile Changes

Subscriptions:

- Free plan uses direct free subscription activation.
- Paid plans initiate Flutterwave checkout.
- App opens hosted checkout with `url_launcher`.
- User can refresh payment status after checkout.
- Verified success refreshes subscription status.

eBooks:

- Premium purchase initiates Flutterwave checkout.
- App opens hosted checkout with `url_launcher`.
- User can refresh payment status after checkout.
- Verified success confirms purchase entitlement and adds the eBook to library.

Affected files:

- `apps/mobile-flutter/pubspec.yaml`
- `apps/mobile-flutter/lib/core/subscriptions/subscription_service.dart`
- `apps/mobile-flutter/lib/core/subscriptions/subscription_models.dart`
- `apps/mobile-flutter/lib/screens/subscription_screen.dart`
- `apps/mobile-flutter/lib/core/ebooks/ebook_service.dart`
- `apps/mobile-flutter/lib/core/ebooks/models/ebook_models.dart`
- `apps/mobile-flutter/lib/screens/ebook_details_screen.dart`

## Schema and Config

Schema:

- Added `TransactionType.EBOOK_PURCHASE`.

Migration:

- `services/api/prisma/migrations/20260610202500_add_ebook_purchase_transaction_type/migration.sql`

Config:

- Added `PAYMENT_REDIRECT_BASE_URL`.
- Env validation now validates `PAYMENT_REDIRECT_BASE_URL` when present.

Affected files:

- `services/api/prisma/schema.prisma`
- `.env.example`
- `.env.staging.example`
- `.env.production.example`
- `services/api/.env.example`
- `scripts/env/validate-env.mjs`

## Rollback Strategy

Rollback is code-first:

- Revert Milestone 3 backend, admin, mobile, report, and env changes.
- The enum migration is additive. If rollback must remove `EBOOK_PURCHASE`, first ensure no rows use that enum value, then perform a controlled PostgreSQL enum replacement migration.

## Remaining Work

- Run real Flutterwave sandbox checkout and webhook validation with real credentials.
- Add deep-link return handling for a smoother mobile post-checkout experience.
- Add refund and chargeback webhook handling.
- Add paginated admin filters for transactions and webhook events.
