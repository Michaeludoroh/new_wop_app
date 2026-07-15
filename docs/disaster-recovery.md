# WOPP — Disaster Recovery Plan (Critical-Path)

## Purpose

Define the minimum operational disaster-recovery procedure for WOPP with focus on production-critical services and fast restoration.

---

## Recovery Objectives

- **RTO (Recovery Time Objective):** 60 minutes for core platform restoration
- **RPO (Recovery Point Objective):** 15 minutes for transactional data where backup cadence supports it

Critical services:
1. API
2. PostgreSQL
3. Redis
4. WebSocket
5. Alerting/observability control-plane (Prometheus + Alertmanager + Grafana)

---

## Incident Severity Classes

- **SEV-1:** Full production outage or data integrity risk
- **SEV-2:** Major feature outage with degraded business continuity
- **SEV-3:** Partial degradation with workaround

---

## DR Activation Criteria

Trigger DR workflow when:
- Primary environment cannot be restored within 15 minutes for SEV-1
- Data-store corruption or unrecoverable infra failure is confirmed
- Multi-service dependency failure causes full customer impact

---

## Roles & Ownership

- **Incident Commander (IC):** Coordinates recovery timeline and decisions
- **Platform Engineer:** Infrastructure failover, networking, compose/runtime restoration
- **DB Owner:** Backup validation, restore execution, integrity checks
- **API Owner:** Service validation and auth/payment critical path checks
- **Communications Lead:** Stakeholder and status-page updates

---

## Prerequisites

- Verified and recent PostgreSQL backups
- Recovery credentials in managed secret store
- Access to deployment artifacts and compose manifests
- Runbooks available:
  - `docs/runbooks/api-outage.md`
  - `docs/runbooks/postgres-outage.md`
  - `docs/runbooks/redis-outage.md`
  - `docs/runbooks/websocket-outage.md`
  - `docs/runbooks/payment-outage.md`
  - `docs/runbooks/notification-outage.md`

---

## Recovery Procedures (Critical Path)

## 1) Stabilize control plane
1. Bring up infrastructure dependencies (network, postgres, redis).
2. Start API and websocket services.
3. Restore observability stack:
   - Prometheus
   - Alertmanager
   - Grafana
4. Confirm scrape and alert control path:
   - Prometheus `/api/v1/targets` reachable
   - Alertmanager `/api/v2/status` reachable

## 2) Restore data plane
1. Validate database health.
2. If needed, restore latest good PostgreSQL backup.
3. Validate schema compatibility and migration state.
4. Validate Redis availability and key expiration behavior.

## 3) Validate application critical path
1. API health endpoint: `200`
2. Auth critical path:
   - register valid payload -> expected success
   - login valid credentials -> expected success
   - refresh valid token -> expected success
   - invalid auth cases -> expected 401/400
3. WebSocket health endpoint: `200`

## 4) Validate alerting path
1. Inject synthetic critical/high/medium alerts to Alertmanager API.
2. Verify receiver routing:
   - critical -> `critical-escalation`
   - high -> `high-priority`
   - medium -> `medium-priority`
3. Verify inhibition:
   - critical alert suppresses matching high/medium as configured.

## 5) Public/internal communications
1. Update status page with incident + mitigation.
2. Publish restoration ETA and completion update.
3. Record timeline and actions for post-incident review.

---

## Data Restore Validation Checklist

- [ ] DB restored from correct backup timestamp
- [ ] Core auth/user tables healthy and queryable
- [ ] Payment records integrity checks passed
- [ ] Notification queue/state consistency confirmed
- [ ] App login and token refresh flow operational

---

## DR Exit Criteria

Declare DR complete when:
- Critical-path services are healthy
- Auth path and API baseline checks pass
- Alerting and observability pipeline confirmed operational
- Stakeholder communication completed
- Incident report started with root-cause and follow-up actions

---

## Known Residual Risks

- Dependency vulnerabilities tracked in `docs/security-audit.md`
- Rate-limiting hardening is still a launch blocker unless remediated/risk-accepted
- Full-scale load recovery simulation not covered in this critical-path cycle

---

## Post-DR Actions

1. Conduct blameless postmortem within 48 hours.
2. Add automation gaps to technical debt register.
3. Rehearse DR game-day for the failed scenario class within next sprint.
