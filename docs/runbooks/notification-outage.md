# Runbook: Notification Outage

## Trigger Signals

- Notification failure spike alerts
- Delivery success-rate drop below SLO
- Provider/API timeout increases

## Impact

- Broadcast and targeted notifications delayed or undelivered
- Engagement and operational messaging degraded

## Immediate Actions

1. Acknowledge incident and assign notifications owner.
2. Identify affected channels/providers.
3. Confirm whether issue is internal pipeline or downstream provider.
4. Check queue/backlog growth and retry behavior.

## Diagnostics

- Notification service logs and failure reasons
- Provider response codes and rate limits
- Queue metrics (depth, age, retries)
- API dependency and auth health

## Mitigation

- Switch to backup provider if available.
- Increase retry delay to avoid rate-limit amplification.
- Prioritize critical notification classes.
- Pause low-priority campaigns until stable.

## Recovery Validation

- Delivery success ratio recovers to target band
- Queue drains to normal operating levels
- Failure/timeout rates return to baseline

## Communication

- Status page incident entry with affected channels
- Internal stakeholder update on expected delivery delays

## Post-Incident

- Analyze top failure causes
- Harden provider fallback and retry policies
- Update alert thresholds if needed from learned behavior
