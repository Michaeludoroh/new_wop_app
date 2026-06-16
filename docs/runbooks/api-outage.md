# Runbook: API Outage

## Trigger Signals

- `ApiUnavailable` alert firing
- API health endpoint failure (`/api/v1/health`)
- Elevated 5xx and request failures

## Impact

- Admin/API operations degraded or unavailable
- Dependent services may experience cascading failures

## Immediate Actions

1. Acknowledge incident and assign incident commander.
2. Confirm outage scope:
   - single instance/container
   - full service outage
3. Check API container/process status.
4. Verify upstream dependencies (PostgreSQL, Redis, network/DNS).

## Diagnostics

- Container logs
- Health endpoint checks
- Prometheus target status (`up{job="ministry_api"}`)
- Error-rate and latency dashboards

## Mitigation

- Restart failed API instance if safe.
- Roll back most recent deployment/config change.
- Scale horizontally if saturation-related.
- Apply feature flag degradation path for non-critical endpoints.

## Recovery Validation

- `up{job="ministry_api"} == 1`
- 5xx ratio returns to baseline
- p95 latency stabilizes
- No sustained critical/high alerts

## Communication

- Update status page with incident + impact summary
- Provide ETA and workaround where applicable
- Publish resolution + post-incident timeline

## Post-Incident

- Root cause analysis within 24h
- Add prevention action items
- Assess error budget impact and policy actions
