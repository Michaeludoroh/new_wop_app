# SLOs & SLIs — Phase 3C

## Objective

Define measurable reliability targets for core platform domains and align alerting/escalation with business impact.

---

## Measurement Window & Conventions

- **Primary window:** rolling 30 days
- **Secondary windows:** 1h / 6h / 24h (for fast detection and burn-rate alerting)
- **Source of truth:** Prometheus metrics and validated service telemetry
- **Reporting cadence:** weekly operational review, monthly reliability review

---

## API Reliability

### 1) Availability

- **SLI:** successful API availability ratio  
  `sum(rate(api_requests_total{status!~"5.."}[5m])) / sum(rate(api_requests_total[5m]))`
- **SLO:** **99.9%** monthly availability

### 2) Latency

- **SLI:** p95 API latency under threshold (endpoint weighted where possible)
- **Target threshold:** p95 < **500ms**
- **SLO:** **99%** of requests meet p95 latency target monthly

### 3) Error Rate

- **SLI:** 5xx error ratio  
  `sum(rate(api_requests_total{status=~"5.."}[5m])) / sum(rate(api_requests_total[5m]))`
- **SLO:** monthly 5xx ratio < **1%**

---

## WebSocket Reliability

### 1) Availability

- **SLI:** `up{job="ministry_websocket"}`
- **SLO:** **99.9%** monthly availability

### 2) Reconnect Rate

- **SLI:** reconnect attempts per active connection over interval  
  `increase(websocket_reconnects_total[10m]) / clamp_min(avg_over_time(websocket_active_connections[10m]), 1)`
- **SLO:** reconnect rate stays below **2%** per 10m equivalent baseline

### 3) Auth Failure Rate

- **SLI:** auth failures per websocket auth attempts
- **SLO:** auth failure ratio < **1.5%** monthly (excluding invalid-client test traffic)

---

## Payments Reliability

### 1) Success Rate

- **SLI:** successful payments / total payment attempts
- **SLO:** **99.5%** monthly payment success rate

### 2) Webhook Success Rate

- **SLI:** successful webhook processing / total webhook events
- **SLO:** **99.9%** monthly webhook success rate

---

## Notifications Reliability

### 1) Delivery Success Rate

- **SLI:** delivered notifications / attempted notifications
- **SLO:** **99.0%** monthly delivery success rate

---

## Alert Mapping (SLO-Aware)

- **Critical:** availability hard-down / severe burn-rate events
- **High:** sustained degradation likely to consume error budget rapidly
- **Medium:** early warning and trend-level degradation

---

## Exclusions

The following are excluded from SLO accounting unless explicitly reclassified:

- planned maintenance windows
- approved game-day/simulation traffic
- dependency incidents marked as third-party force majeure (tracked separately)

---

## Ownership

- **Primary owner:** SRE / Platform Operations
- **Contributors:** API, Realtime, Payments, Notifications service owners
- **Escalation:** follows `docs/sre/error-budgets.md` policy
