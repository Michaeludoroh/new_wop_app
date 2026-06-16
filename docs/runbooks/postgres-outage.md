# Runbook: PostgreSQL Outage

## Trigger Signals

- Database connection failures from API/WebSocket
- PostgreSQL healthcheck failures
- Postgres exporter down or backend unavailable

## Impact

- API write/read operations degraded or unavailable
- Authentication, payments, notifications persistence impacted

## Immediate Actions

1. Acknowledge and classify incident severity.
2. Confirm outage scope (single node vs full DB unavailability).
3. Verify storage health and host/container status.
4. Check connection pool exhaustion and recent schema/deploy events.

## Diagnostics

- PostgreSQL logs and restart history
- `pg_isready` and active connection count
- Replication/standby status (if configured)
- DB-related error spikes in API logs

## Mitigation

- Restart DB process when safe and corruption risk is low.
- Fail over to standby/replica if configured.
- Temporarily reduce write-heavy background jobs.
- Roll back recent migrations/config if causative.

## Recovery Validation

- DB healthcheck passing
- API dependent endpoints functional
- Error rates and latency trending to normal
- No persistent DB connection failures

## Communication

- Status page update including data integrity statement
- Incident updates with RTO/ETA

## Post-Incident

- Root cause and data consistency validation
- Backup/restore drill review if needed
- Capacity and failover readiness improvements
