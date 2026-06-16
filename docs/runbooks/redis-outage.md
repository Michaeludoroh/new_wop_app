# Runbook: Redis Outage

## Trigger Signals

- Redis healthcheck failure
- Redis exporter down / Redis connection errors
- WebSocket session/pubsub degradation

## Impact

- Cache misses and latency increase
- Realtime messaging/session coordination degraded
- Potential cascading pressure on database/API

## Immediate Actions

1. Acknowledge incident and assign owner.
2. Confirm whether outage is Redis-only or network-related.
3. Check Redis container/process and resource saturation.
4. Validate API/WebSocket dependency errors.

## Diagnostics

- Redis logs and memory/CPU
- `redis-cli ping` and INFO stats
- Prometheus exporter status and Redis panels
- Network reachability from API/WebSocket nodes

## Mitigation

- Restart Redis service if process hung.
- Fail over to replica (if configured).
- Reduce pressure: disable non-critical cache workloads.
- Increase Redis memory limits or tune eviction policy where safe.

## Recovery Validation

- Redis healthchecks passing
- API/WebSocket error rates return to baseline
- Reconnect/auth anomalies stabilize

## Communication

- Update status page and incident channel
- Communicate temporary feature degradations if applied

## Post-Incident

- Document root cause (capacity, network, config, deployment, etc.)
- Add preventive controls (alerts, autoscaling, limits, failover tests)
