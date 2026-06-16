# Webhook Security Report

## Provider

Milestone 3 enables Flutterwave as the only active payment provider.

Runtime protections:

- Only `/api/v1/payments/webhooks/flutterwave` is accepted.
- Webhook route does not require admin JWT.
- Webhook trust is based on Flutterwave `verif-hash` signature verification.
- Unsupported provider names are rejected.

## Verification Model

Flutterwave sends the webhook secret in the `verif-hash` header. The backend compares that value to `FLUTTERWAVE_WEBHOOK_SECRET`.

Rejected cases:

- Missing webhook secret configuration.
- Missing signature.
- Signature mismatch.
- Unsupported provider.
- Missing transaction reference.
- Unknown transaction reference.
- Successful webhook with amount mismatch.
- Successful webhook with currency mismatch.

## Reconciliation Rules

The backend reconciles webhooks against an existing pending transaction:

1. Normalize provider event.
2. Locate transaction by `providerReference`.
3. For success events, verify amount and currency match the pending transaction.
4. Apply status transition.
5. Activate subscription or create eBook entitlement only after verified success.
6. Store webhook event and normalized payload.

## Idempotency

Webhook events use a unique `(provider, externalEventId)` key.

Duplicate behavior:

- Duplicate events are detected before mutation.
- Duplicate events return a duplicate response.
- Entitlements are not granted twice.
- eBook purchases use `upsert` on `(userId, ebookId)`.

## Route Security

Webhook endpoint:

- `POST /api/v1/payments/webhooks/:provider`
- Public route by design.
- No `JwtAuthGuard`.
- No admin role requirement.
- Protected by provider signature and transaction reconciliation.

Admin visibility endpoints:

- `GET /api/v1/payments/history`
- `GET /api/v1/payments/webhook-events`
- Require JWT and admin role for elevated visibility.

## Residual Risks

- Flutterwave sandbox validation must be completed with real credentials.
- The mobile app currently relies on manual status refresh after hosted checkout; deep-link return handling should be added next.
- Refunds and chargebacks are not fully implemented yet.
- Failed amount/currency mismatch events are rejected and do not grant entitlement; production alerting should watch these failures.

## Required Secrets

- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_SECRET`
- `PAYMENT_REDIRECT_BASE_URL`

## Recommendation

Keep paid entitlements disabled in production until a real Flutterwave sandbox run confirms:

- Checkout session creation.
- Successful subscription webhook.
- Failed payment webhook.
- Duplicate webhook replay.
- Invalid signature rejection.
- Successful eBook purchase webhook.
