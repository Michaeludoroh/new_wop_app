# Error Budgets — Phase 3C

## Purpose

Define monthly reliability budgets, operational alert thresholds, and escalation actions to enforce SLO discipline while preserving delivery velocity.

---

## Budget Model

For each service target:

- **Monthly error budget** = `1 - SLO target`
- **Allowed downtime/events** computed over 30 days
- **Consumption tracking** via Prometheus + SRE review cadence

Reference month duration used: **43,200 minutes** (30 days)

---

## Monthly Budgets

### API (Availability SLO: 99.9%)

- Error budget: **0.1%**
- Allowed downtime/month: **43.2 minutes**

### API (5xx Rate SLO: <1%)

- Error budget: **1% bad events**
- Allowed bad event ratio/month: **up to 1%**

### WebSocket (Availability SLO: 99.9%)

- Error budget: **0.1%**
- Allowed downtime/month: **43.2 minutes**

### Payments (Success SLO: 99.5%)

- Error budget: **0.5% failed transactions**
- Allowed failed transaction ratio/month: **up to 0.5%**

### Payment Webhooks (Success SLO: 99.9%)

- Error budget: **0.1% failed webhook processing**
- Allowed failed webhook ratio/month: **up to 0.1%**

### Notifications (Delivery SLO: 99.0%)

- Error budget: **1.0% failed deliveries**
- Allowed failed delivery ratio/month: **up to 1.0%**

---

## Burn-Rate Thresholds

## Fast Burn (Urgent)

- Trigger when projected monthly budget exhaustion < 24h
- Typical detection windows: 5m and 1h
- Severity: **critical/high** (depending on blast radius)

## Sustained Burn (Serious)

- Trigger when projected exhaustion < 7 days
- Typical detection windows: 1h and 6h
- Severity: **high**

## Slow Burn (Watch)

- Trigger when consumption trend exceeds steady-state allowance
- Typical detection windows: 6h and 24h
- Severity: **medium**

---

## Escalation Policy

### Critical

- Immediate page to on-call SRE + service owner
- Incident bridge opened
- Leadership notification if customer impact exceeds 15m
- Freeze non-essential deploys until stabilized

### High

- On-call acknowledgement within 10 minutes
- Service owner engaged within 30 minutes
- Mitigation plan documented in incident ticket
- Change risk review for active rollout

### Medium

- Acknowledge within business SLA
- Add to operational queue and reliability backlog
- Track trend and upgrade severity if burn accelerates

---

## Budget Policy Actions

- **>25% consumed in first week:** reliability review mandatory
- **>50% consumed mid-cycle:** freeze risky changes for affected service
- **>75% consumed:** incident-manager approval required for production changes
- **100% exhausted:** only reliability/incident fixes allowed until recovery window achieved

---

## Governance

- Weekly budget report posted to operations channel
- Monthly SLO/error-budget review chaired by SRE
- Post-incident reviews must include budget impact and prevention actions

---

## Related Documents

- `docs/sre/slos-slis.md`
- `docs/runbooks/`
- `docs/observability.md`
