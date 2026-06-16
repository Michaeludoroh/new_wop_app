# Runbook: Payment Outage

## Trigger Signals

- Payment failure spike alerts
- Webhook failure spike alerts
- Provider timeout/error rate anomalies

## Impact

- Failed checkouts and subscription lifecycle disruption
- Delayed or missing payment state transitions
- Revenue and customer trust impact

## Immediate Actions

1. Acknowledge incident and involve payments owner.
2. Identify impacted provider(s) and transaction scope.
3. Verify webhook ingress/verification pipeline health.
4. Confirm database write path and idempotency behavior.

## Diagnostics

- Provider API/webhook logs and status pages
- Internal payment service logs
- Failure codes and distribution by provider/event type
- Queue/backlog depth for retries (if implemented)

## Mitigation

- Enable provider failover path if supported.
- Increase retry backoff window for transient provider errors.
- Pause non-critical payment jobs that amplify load.
- Apply temporary manual reconciliation workflow for critical transactions.

## Recovery Validation

- Payment success rate returns to SLO band
- Webhook success rate stabilizes
- No duplicate charge/state-transition anomalies

## Communication

- Status page update with affected payment functions
- Customer support bulletin if customer-facing impact exists

## Post-Incident

- Reconcile in-flight transactions
- Validate ledger consistency and webhook idempotency
- Capture provider SLA impact and escalation outcomes
