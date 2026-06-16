# Observability Guide (Phase 3C)

## Overview

Phase 3C extends production-grade operational visibility into **operational automation** for the ministry platform using:

- **Prometheus** for metrics collection and alert rule evaluation
- **Grafana** for dashboards and telemetry visualization
- **Prometheus exporters** for Redis and PostgreSQL infrastructure telemetry
- **Docker Compose (dev)** integration for local/CI validation
- **Alertmanager** for alert routing, grouping, suppression/inhibition, deduplication, and escalation
- **Grafana alerting policies/contact points** for unified operator notification paths
- **SLO/SLI definitions** and **error budget policies**
- **Incident runbooks** for critical services
- **Internal status dashboard** for operations visibility

This observability layer enables:

- Health visualization
- Incident detection
- Degradation detection
- Business workflow monitoring
- Automated operator alerting
- Reliability target tracking (SLO/SLI)
- Error budget governance
- Incident response standardization
- Operational status communication

---

## Architecture

### Components

- **API service** (`api:4000`) exposing metrics at `/api/v1/metrics`
- **WebSocket service** (`websocket:4100`) exposing metrics at `/api/v1/metrics`
- **Redis exporter** (`redis-exporter:9121`) exposing `/metrics`
- **PostgreSQL exporter** (`postgres-exporter:9187`) exposing `/metrics`
- **Prometheus** (`prometheus:9090`) scraping targets and evaluating alert rules
- **Alertmanager** (`alertmanager:9093`) handling routing/grouping/inhibition/escalation
- **Grafana** (`grafana:3000` container, host `3005`) with provisioned datasource, dashboards, and alerting policies

### Data Flow

1. Services/exporters expose metrics endpoints.
2. Prometheus scrapes configured targets every 15s.
3. Prometheus evaluates alerts from `infrastructure/prometheus/alerts.yml`.
4. Prometheus forwards firing alerts to Alertmanager (`infrastructure/alertmanager/alertmanager.yml`).
5. Alertmanager groups, suppresses, deduplicates, routes, and escalates notifications.
6. Grafana queries Prometheus datasource (`uid: prometheus`) and renders dashboards.
7. Grafana alerting contact points/policies provide complementary operator routing paths.

---

## Scrape Targets

Configured in: `infrastructure/prometheus/prometheus.yml`

- `prometheus:9090` (`job_name: prometheus`)
- `api:4000` with `metrics_path: /api/v1/metrics` (`job_name: ministry_api`)
- `websocket:4100` with `metrics_path: /api/v1/metrics` (`job_name: ministry_websocket`)
- `redis-exporter:9121` (`job_name: redis_exporter`)
- `postgres-exporter:9187` (`job_name: postgres_exporter`)

Labels include:
- `service`
- `layer`
- global external labels:
  - `environment: development`
  - `stack: ministry-platform`

---

## Metrics Catalog (Operationally Used)

The following metric families are referenced by dashboards and alerts:

### Platform / Infra
- `up`
- container/process/system metrics exposed by service instrumentation and exporters
- Redis/PostgreSQL exporter metrics (availability and backend health)

### API
- `api_requests_total`
- route/status based dimensions used for throughput and error-rate panels

### Auth
- `auth_failures_total`
- login/refresh/logout and validation-failure counters (instrumented in API observability pipeline)

### Payments
- `payment_failures_total`
- payment attempt/success/failure and webhook telemetry counters

### Notifications
- `notification_failures_total`
- broadcast/targeted sends and delivery telemetry counters

### Realtime/WebSocket
- `websocket_reconnects_total`
- connection/auth/room/reconnect counters and gauges

---

## Grafana Provisioning

### Datasource

File: `infrastructure/grafana/provisioning/datasources/prometheus.yml`

- Datasource name: `Prometheus`
- UID: `prometheus`
- URL: `http://prometheus:9090`
- Default datasource: `true`
- Query method: `POST`
- Min interval: `15s`

### Dashboards Provider

File: `infrastructure/grafana/provisioning/dashboards/dashboards.yml`

- Provider name: `Ministry Platform Dashboards`
- Folder: `Ministry Platform`
- Filesystem path: `/var/lib/grafana/dashboards`
- Auto-refresh scan: every 30s

---

## Dashboards

Dashboard JSON files in `infrastructure/grafana/dashboards/`:

1. `infrastructure.json` — **Infrastructure**
   - API uptime
   - WebSocket uptime
   - PostgreSQL health
   - Redis health
   - container health
   - memory usage
   - CPU usage

2. `api-operations.json` — **API Operations**
   - requests/sec
   - request latency
   - 4xx rate
   - 5xx rate
   - top endpoints
   - slow endpoints

3. `authentication.json` — **Authentication**
   - logins
   - failed logins
   - refresh requests
   - logout requests
   - JWT validation failures
   - RBAC denials

4. `payments.json` — **Payments**
   - payment attempts
   - successful payments
   - failed payments
   - webhook volume
   - webhook failures
   - subscription lifecycle events

5. `notifications.json` — **Notifications**
   - broadcasts sent
   - targeted notifications sent
   - delivery success rate
   - delivery failures
   - queue size (if available)

6. `realtime.json` — **Realtime**
   - active connections
   - connections/sec
   - disconnects/sec
   - auth failures
   - room count
   - reconnect attempts
   - tracks known issues WS-001 and WS-002 via dashboard context/annotations

---

## Alert Rules

Configured in: `infrastructure/prometheus/alerts.yml`

### Critical

- `ApiUnavailable`
- `WebSocketUnavailable`
- `RedisExporterUnavailable`
- `PostgresExporterUnavailable`

### High

- `PaymentFailureSpike`
- `WebhookFailureSpike`
- `NotificationFailureSpike`

### Medium

- `ElevatedAuthFailures`
- `ElevatedReconnectAttempts`
- `Elevated5xxRate`

Rule groups:
- `ministry-platform-critical`
- `ministry-platform-high`
- `ministry-platform-medium`

---

## Alert Routing & Notification Automation (Phase 3C)

### Alertmanager

Files:
- `infrastructure/alertmanager/alertmanager.yml`
- `infrastructure/prometheus/prometheus.yml` (alertmanager target integration)

Implemented:
- Severity-based routing (`critical`, `high`, `medium`)
- Domain-based routing (`payments`, `notifications`)
- Alert grouping:
  - `group_by: [alertname, service, domain, severity]`
  - `group_wait: 30s`
  - `group_interval: 5m`
  - `repeat_interval: 3h`
- Alert suppression/inhibition rules:
  - Critical suppresses lower severities for same alert context
- Escalation channels:
  - Email
  - Slack
  - Discord
  - Generic webhooks

### Grafana Alerting Provisioning

Files:
- `infrastructure/grafana/provisioning/alerting/contact-points.yml`
- `infrastructure/grafana/provisioning/alerting/policies.yml`

Provisioned:
- Contact points for email/slack/discord/webhook
- Policy routing by severity/domain

## SLOs, SLIs & Error Budgets (Phase 3C)

- SLO/SLI definitions: `docs/sre/slos-slis.md`
- Error budgets & escalation policy: `docs/sre/error-budgets.md`

Covered domains:
- API: availability, latency, error rate
- WebSocket: availability, reconnect rate, auth failure rate
- Payments: success rate, webhook success rate
- Notifications: delivery success rate

## Incident Response Runbooks

Runbooks in `docs/runbooks/`:
- `api-outage.md`
- `redis-outage.md`
- `postgres-outage.md`
- `websocket-outage.md`
- `payment-outage.md`
- `notification-outage.md`

## Internal Status Dashboard

- Admin status page: `apps/admin-web/app/status/page.tsx`
- Displays:
  - service status
  - uptime
  - incidents
  - maintenance windows

## Docker Compose Integration

File: `docker-compose.dev.yml`

Integrated services:

- `prometheus` (host port `9090`)
- `alertmanager` (host port `9093`)
- `grafana` (host port `3005`)
- `redis-exporter` (host port `9121`)
- `postgres-exporter` (host port `9187`)

Dependencies wire Prometheus to API/WebSocket and exporters to Redis/PostgreSQL health gates.

---

## Critical-Path Validation Runbook

> Scope: observability and operational automation components only (no business-logic regression reruns).

1. Start stack:
   - `docker compose -f docker-compose.dev.yml up -d --build`

2. Validate service health:
   - `docker compose -f docker-compose.dev.yml ps`

3. Validate Prometheus scrape status:
   - Open `http://localhost:9090/targets`
   - Confirm all expected jobs are `UP`

4. Validate alert rule load:
   - Open `http://localhost:9090/rules`
   - Confirm all three rule groups are present

5. Validate Grafana datasource:
   - Open `http://localhost:3005`
   - Login `admin/admin` (unless overridden)
   - Confirm Prometheus datasource is healthy

6. Validate dashboard population:
   - Open each provisioned dashboard
   - Confirm panels resolve queries and render timeseries/stat values

7. Validate alert routing:
   - Trigger representative critical/high/medium alerts
   - Confirm routing to expected receivers/channels

8. Validate grouping/suppression:
   - Trigger related alert sets
   - Confirm grouped notifications and inhibition behavior

9. Validate status page:
   - Open Admin status page
   - Confirm service status, uptime, incidents, maintenance windows render

---

## Troubleshooting

### Prometheus target down

- Check container status: `docker compose -f docker-compose.dev.yml ps`
- Check logs:
  - `docker compose -f docker-compose.dev.yml logs prometheus`
  - `docker compose -f docker-compose.dev.yml logs api`
  - `docker compose -f docker-compose.dev.yml logs websocket`
- Verify metrics endpoints:
  - `http://localhost:4000/api/v1/metrics`
  - `http://localhost:4100/api/v1/metrics`

### Grafana dashboards not visible

- Verify provisioning mounts in compose file
- Check Grafana logs:
  - `docker compose -f docker-compose.dev.yml logs grafana`
- Ensure provider path contains dashboard JSON files:
  - `/var/lib/grafana/dashboards`

### Exporters unavailable

- Redis exporter:
  - verify `REDIS_ADDR` and redis health
- PostgreSQL exporter:
  - verify `DATA_SOURCE_NAME`, postgres credentials/db, and network reachability

### Alert not firing

- Confirm metric name and labels match expressions
- Confirm query returns threshold-exceeding values in Prometheus expression browser
- Confirm `for:` duration has elapsed

---

## Operational Runbooks

### Incident: API unavailable

1. Acknowledge `ApiUnavailable`
2. Inspect API container logs
3. Validate DB/Redis dependencies
4. Mitigate and verify `up{job="ministry_api"} == 1`

### Incident: WebSocket unavailable

1. Acknowledge `WebSocketUnavailable`
2. Inspect websocket container logs
3. Validate Redis adapter dependency
4. Mitigate and verify `up{job="ministry_websocket"} == 1`

### Incident: Payment/Webhook failure spike

1. Triage `PaymentFailureSpike` / `WebhookFailureSpike`
2. Correlate with payments dashboard and API 5xx panel
3. Inspect payment provider/webhook logs and signature validation path
4. Apply mitigation and monitor return to baseline

### Incident: Notification failure spike

1. Triage `NotificationFailureSpike`
2. Correlate Notifications + API dashboards
3. Inspect notification pipeline and downstream providers
4. Apply mitigation and monitor

---

## Known Technical Debt (Tracked, Non-Blocking)

- **WS-001**: `stale_session_rejected` timeout investigation
- **WS-002**: `reconnect_cycle` timeout investigation

These are tracked investigations and do **not** block Phase 3C operational automation readiness.
