# Release Readiness Scorecard — WOPP

**Release version:** _______________  
**Target:** ☐ Staging deployment · ☐ Production launch  
**Evaluation date:** _______________  
**Evaluator:** _______________

---

## How to score

1. Complete all companion checklists and enter pass rates below.
2. Apply **weights** to compute weighted score per domain.
3. Record **blockers** from `RELEASE_BLOCKERS_CHECKLIST.md`.
4. Use **decision matrix** at bottom for final recommendation.

### Severity weights (for defect density adjustment)

| Severity | Point deduction per open defect |
|----------|--------------------------------|
| Critical | −15 points (domain cap at 0) |
| High | −5 points |
| Medium | −2 points |
| Low | −0.5 points |

### Pass rate calculation

```
Pass Rate % = (PASS count / (PASS + FAIL + BLOCKED)) × 100
```

BLOCKED counts as FAIL unless resolved before scoring.

---

## Domain scorecard

| # | Domain | Weight | Checklist source | Tests | PASS | FAIL | BLOCKED | Pass % | Defects (C/H/M/L) | Adjusted score (/100) |
|---|--------|--------|------------------|-------|------|------|---------|--------|-------------------|----------------------|
| 1 | Infrastructure & DevOps | 10% | `RELEASE_BLOCKERS` §1, `docs/release-checklist` | | | | | | | |
| 2 | API & contracts | 15% | `API_VALIDATION_CHECKLIST.md` | | | | | | | |
| 3 | Authentication & security | 15% | `API_VALIDATION` §2,14 + `docs/security-audit` | | | | | | | |
| 4 | Payments & entitlements | 15% | `PAYMENT_VALIDATION_CHECKLIST.md` | | | | | | | |
| 5 | Notifications & push | 10% | `BROADCAST_PUSH_*`, `DEVICE_SMOKE_TEST_PLAN` | | | | | | | |
| 6 | Mobile application | 15% | `MOBILE_SMOKE_TEST_CHECKLIST.md` | | | | | | | |
| 7 | Admin dashboard | 10% | `ADMIN_SMOKE_TEST_CHECKLIST.md` | | | | | | | |
| 8 | Data & recovery | 5% | `RELEASE_BLOCKERS` §8, `docs/disaster-recovery` | | | | | | | |
| 9 | Observability & SRE | 5% | `docs/observability`, runbooks | | | | | | | |
| | **TOTAL** | **100%** | | | | | | | | |

### Adjusted score formula (per domain)

```
Adjusted = min(100, Pass% − Critical×15 − High×5 − Medium×2 − Low×0.5)
Weighted contribution = Adjusted × Weight
```

### Overall readiness score

```
OVERALL SCORE = Σ (Weighted contribution) = _______ / 100
```

---

## Module readiness matrix

Mark each implemented module: **Ready · Partial · Not Ready · N/A**

| Module | Backend API | Admin UI | Mobile UI | E2E validated | Status | Notes |
|--------|:-----------:|:--------:|:---------:|:-------------:|--------|-------|
| Authentication | ☐ | ☐ | ☐ | ☐ | | |
| Users | ☐ | ☐ | N/A | ☐ | | |
| Announcements | ☐ | ☐ | ☐ | ☐ | | |
| Events (+ RSVP) | ☐ | ☐ | ☐ | ☐ | | |
| Clips | ☐ | ☐ | ☐ | ☐ | | |
| eBooks / Library | ☐ | ☐ | ☐ | ☐ | | |
| Subscriptions | ☐ | ☐ | ☐ | ☐ | | |
| Payments (Flutterwave) | ☐ | ☐ | ☐ | ☐ | | |
| Notifications (in-app) | ☐ | ☐ | ☐ | ☐ | | |
| Push (FCM) | ☐ | ☐ | N/A | ☐ | | |
| Programs | ☐ | ☐ | ☐ | ☐ | | |
| Mentorship | ☐ | ☐ | ☐ | ☐ | | |
| Policies | ☐ | ☐ | ☐ | ☐ | | |
| Analytics | ☐ | ☐ | N/A | ☐ | | |
| Realtime / WebSocket | ☐ | N/A | N/A | ☐ | | |
| Content hub (`/content`) | N/A | **Placeholder** | N/A | N/A | Not Ready | Low priority |

---

## Critical path status

| Critical path | Status | Evidence link |
|---------------|--------|---------------|
| User can register, login, and browse content | ☐ Pass ☐ Fail | |
| User can purchase subscription and access premium content | ☐ Pass ☐ Fail | |
| User can purchase ebook and read in app | ☐ Pass ☐ Fail | |
| Admin can publish announcement visible on mobile | ☐ Pass ☐ Fail | |
| Admin can send push notification to devices | ☐ Pass ☐ Fail | |
| User can RSVP to event with persisted state | ☐ Pass ☐ Fail | |
| Payment webhook grants entitlement correctly | ☐ Pass ☐ Fail | |

**Critical path rule:** All 7 must **Pass** for production GO.

---

## Environment readiness

| Environment | Config complete | Smoke passed | Data seeded | Scorecard complete |
|-------------|-----------------|--------------|-------------|-------------------|
| Local (Docker) | ☐ | ☐ | ☐ | ☐ |
| Staging | ☐ | ☐ | ☐ | ☐ |
| Production | ☐ | ☐ | ☐ | ☐ |

### Staging env checklist (quick)

| Variable / config | Set | Verified |
|-------------------|-----|----------|
| `DATABASE_URL` | ☐ | ☐ |
| JWT secrets | ☐ | ☐ |
| `REDIS_URL` | ☐ | ☐ |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ☐ | ☐ |
| `FLUTTERWAVE_*` (sandbox) | ☐ | ☐ |
| `SMTP_*` | ☐ | ☐ |
| `NEXT_PUBLIC_API_BASE_URL` | ☐ | ☐ |
| Mobile `API_BASE_URL` dart-define | ☐ | ☐ |

---

## Open blockers & risks

| ID | Description | Severity | Owner | Target date | Status |
|----|-------------|----------|-------|-------------|--------|
| | | | | | |
| | | | | | |
| | | | | | |

### Known deferred items

| Item | Impact | Accepted for this release? |
|------|--------|----------------------------|
| iOS APNs production validation | iOS push in prod | ☐ Yes ☐ No |
| Admin `/content` placeholder | No unified CMS | ☐ Yes ☐ No |
| Push retry cron | Failed push retry | ☐ Yes ☐ No |
| Stripe/Paystack providers | N/A — not implemented | ☐ N/A |

---

## Decision matrix

| Overall score | Critical path | Blockers (CRIT) | Recommendation |
|---------------|---------------|-----------------|----------------|
| ≥ 90 | All pass | 0 | **GO** — production ready |
| 80–89 | All pass | 0 | **GO with conditions** — document medium defects |
| 70–79 | All pass | 0 | **Staging only** — fix high defects before prod |
| < 70 | Any fail | Any | **NO-GO** |
| Any | Any fail | ≥ 1 CRIT | **NO-GO** |

---

## Final recommendation

| Option | Selected |
|--------|----------|
| ☐ **GO** — Approve staging deployment | |
| ☐ **GO** — Approve production launch | |
| ☐ **CONDITIONAL GO** — Launch with listed accepted risks | |
| ☐ **NO-GO** — Block release; re-evaluate after fixes | |

**Overall score:** _______ / 100  
**Critical path:** _____ / 7 pass  
**Critical blockers:** _______

### Approvals

| Role | Name | Signature | Date | GO / NO-GO |
|------|------|-----------|------|------------|
| QA Lead | | | | |
| Mobile Lead | | | | |
| Backend Lead | | | | |
| DevOps Lead | | | | |
| Product Owner | | | | |
| Technical Lead | | | | |
| Executive sponsor (prod only) | | | | |

---

## Post-release monitoring (first 72 hours)

| Metric | Baseline | Alert threshold | Owner |
|--------|----------|-----------------|-------|
| API error rate (5xx) | | > 1% | Backend |
| Auth failure spike | | > 2× baseline | Backend |
| Payment webhook failures | | Any CRIT | Backend |
| FCM delivery failure rate | | > 10% | Backend |
| Mobile crash-free sessions | | < 99% | Mobile |
| P95 API latency | | > 2× baseline | DevOps |

---

## Document references

| Document | Path |
|----------|------|
| Master E2E plan | `E2E_VALIDATION_PLAN.md` |
| Mobile smoke | `MOBILE_SMOKE_TEST_CHECKLIST.md` |
| Admin smoke | `ADMIN_SMOKE_TEST_CHECKLIST.md` |
| API validation | `API_VALIDATION_CHECKLIST.md` |
| Payment validation | `PAYMENT_VALIDATION_CHECKLIST.md` |
| Release blockers | `RELEASE_BLOCKERS_CHECKLIST.md` |
| Critical-path gate | `docs/release-checklist.md` |
| Beta go/no-go history | `BETA_GO_NO_GO_REPORT.md` |

---

## Revision history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-17 | QA | Initial scorecard template |
