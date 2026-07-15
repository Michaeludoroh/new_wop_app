# WOPP — Release Checklist (Critical-Path)

## Usage

This checklist is the mandatory pre-release gate for production launch decisions.

Legend:
- [ ] not complete
- [x] complete
- [N/A] not applicable for this release window

---

## 1) Service Health & Runtime Baseline

- [x] API health endpoint returns `200`
- [x] WebSocket service healthy
- [x] PostgreSQL healthy
- [x] Redis healthy
- [x] Admin web healthy
- [x] Prometheus healthy
- [x] Alertmanager healthy
- [x] Grafana service available (control plane)

Evidence:
- Compose status and health checks validated during Phase 4 critical-path session.

---

## 2) Observability & Alerting

- [x] Prometheus critical scrape targets are all `up`:
  - [x] `ministry_api`
  - [x] `ministry_websocket`
  - [x] `postgres_exporter`
  - [x] `redis_exporter`
  - [x] `prometheus`
- [x] Alertmanager config loaded and active (`/api/v2/status`)
- [x] Severity routing validated:
  - [x] critical -> `critical-escalation`
  - [x] high -> `high-priority`
  - [x] medium -> `medium-priority`
- [x] Inhibition/suppression validated:
  - [x] critical suppresses matching high alert per inhibit rules

Notes:
- Redis exporter instability was resolved via explicit network attachment in compose.

---

## 3) Auth Critical Runtime Validation

- [x] Register valid payload succeeds (`201`)
- [x] Login valid credentials succeeds (`201`)
- [x] Refresh valid token succeeds (`201`)
- [x] Login wrong password denied (`401`)
- [x] Refresh invalid token denied (`401`)
- [x] `/auth/me` without token denied (`401`)
- [x] Invalid DTO shape rejected (`400`)

---

## 4) Security Gate

- [x] Security audit documented in `docs/security-audit.md`
- [ ] High-priority remediation complete:
  - [x] Rate limiting evidence verified for auth endpoints (`/auth/login`, `/auth/forgot-password`) with 429 after threshold (SEC-001 mitigated for tested routes)
  - [x] API dependency vulnerability reduction to policy target (SEC-002 fixed: latest API audit = 0 vulnerabilities)
  - [ ] Admin dependency vulnerability reduction to policy target (SEC-003 still open; accepted risk pending major upgrade path)
- [ ] Final risk acceptance signed by owners for any unremediated blocker

---

## 5) Data & Recovery Preparedness

- [x] Disaster recovery playbook published (`docs/disaster-recovery.md`)
- [x] Runbooks present for API/Redis/Postgres/WebSocket/Payment/Notification outages
- [ ] Backup restore drill completed for release window
- [ ] Rollback rehearsal completed for release window

---

## 6) Deployment Controls

- [ ] Production env vars validated and complete
- [ ] CORS production allowlist explicitly configured
- [ ] Secrets sourced from managed store (not static files)
- [ ] Release artifacts versioned and immutable
- [ ] Rollback artifact/version confirmed

---

## 7) Documentation Completeness

- [x] `docs/performance-report.md` complete
- [x] `docs/disaster-recovery.md` complete
- [x] `docs/release-checklist.md` complete
- [ ] `docs/production-readiness.md` complete and approved

---

## 8) Launch Decision Gate (Must be explicit)

- [ ] Go / No-Go recorded
- [ ] Launch blockers recorded
- [ ] Accepted risks recorded
- [ ] Technical debt recorded
- [ ] Deployment recommendation recorded

---

## Current Gate Snapshot (This Validation Cycle)

- Critical-path runtime/observability/alert-routing checks: **PASS**
- Security gate: **PARTIAL PASS** (SEC-001 mitigated for tested auth routes, SEC-002 fixed, SEC-003 accepted-risk/open)
- Overall release gate: **HOLD** until remaining blocker risk acceptance is formally signed and/or admin-web vulnerability remediation is completed.
