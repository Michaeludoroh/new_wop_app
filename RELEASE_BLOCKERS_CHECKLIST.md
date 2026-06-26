# Release Blockers Checklist — WOP Ministry Platform

**Purpose:** Hard gates that **must pass** before staging deployment or production launch.  
Any **Critical** blocker = **NO-GO** until resolved or formally accepted in writing.  
**Companion:** `RELEASE_READINESS_SCORECARD.md`, `docs/release-checklist.md`, `BETA_GO_NO_GO_REPORT.md`

---

## Blocker classification

| Class | Action if FAIL |
|-------|----------------|
| **BLOCKER-CRIT** | Stop release; fix required |
| **BLOCKER-HIGH** | Stop release unless signed risk acceptance by Tech Lead + Product Owner |
| **ACCEPTED-RISK** | Document in release notes with owner + expiry date |

---

## 1. Infrastructure & runtime (BLOCKER-CRIT)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-INF-01 | API health | `GET /api/v1/health` | `200 ok` | ☐ | DevOps |
| RB-INF-02 | PostgreSQL | Docker health / connectivity | healthy | ☐ | DevOps |
| RB-INF-03 | Redis | `redis-cli ping` | PONG | ☐ | DevOps |
| RB-INF-04 | WebSocket service | Port 4100 health | healthy | ☐ | DevOps |
| RB-INF-05 | Admin web | `/login` loads | 200 | ☐ | DevOps |
| RB-INF-06 | Docker Compose (staging/prod) | All services running | 0 unhealthy | ☐ | DevOps |
| RB-INF-07 | TLS / reverse proxy (prod) | HTTPS valid cert | No browser warnings | ☐ | DevOps |
| RB-INF-08 | Secrets not in git | Scan repo | No live keys committed | ☐ | Security |

**Evidence:** Health JSON screenshot + `docker compose ps`.

---

## 2. Authentication & security (BLOCKER-CRIT)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-AUTH-01 | Register / login / refresh | API smoke | All succeed | ☐ | Backend |
| RB-AUTH-02 | Invalid credentials rejected | Wrong password | 401 | ☐ | Backend |
| RB-AUTH-03 | RBAC enforced | USER → admin route | 403 | ☐ | Backend |
| RB-AUTH-04 | JWT secrets strength | Env audit | ≥32 chars, not default | ☐ | Security |
| RB-AUTH-05 | Rate limiting on auth | Brute force test | 429 after threshold | ☐ | Security |
| RB-AUTH-06 | API dependency audit | `npm audit` (API) | 0 critical/high (policy) | ☐ | Security |
| RB-AUTH-07 | CORS restricted | Non-allowed origin | Blocked | ☐ | Backend |

**Known open item:** Admin-web dependency vulns (SEC-003) — requires risk acceptance if not fixed.

---

## 3. Payments (BLOCKER-CRIT)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-PAY-01 | Flutterwave credentials configured | Env check | Keys present (prod keys in prod only) | ☐ | Backend |
| RB-PAY-02 | Subscription checkout E2E | Sandbox purchase | Entitlement active | ☐ | QA |
| RB-PAY-03 | eBook checkout E2E | Sandbox purchase | Access granted | ☐ | QA |
| RB-PAY-04 | Webhook signature verification | Invalid hash test | Rejected | ☐ | Backend |
| RB-PAY-05 | Webhook idempotency | Duplicate delivery | Single entitlement | ☐ | Backend |
| RB-PAY-06 | No double-charge on retry | Replay checkout success | One payment row | ☐ | Backend |

**Evidence:** `PAYMENT_VALIDATION_CHECKLIST.md` sign-off.

---

## 4. Notifications & push (BLOCKER-CRIT / HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-NTF-01 | Firebase Admin credentials | Env check | FCM credentials set | ☐ | Backend |
| RB-NTF-02 | Device token registration | Mobile login | DB row created | ☐ | Mobile |
| RB-NTF-03 | Admin broadcast PUSH | Admin → device | Push received | ☐ | QA |
| RB-NTF-04 | Broadcast push wiring | API logs | `sendBroadcast` called | ☐ | Backend |
| RB-NTF-05 | iOS APNs production | **Deferred** | Mark ACCEPTED-RISK if deferred | ☐ | Mobile |
| RB-NTF-06 | Push retry cron | Optional | Known gap — ACCEPTED-RISK | ☐ | Backend |

**Evidence:** `BROADCAST_PUSH_VERIFICATION_CHECKLIST.md` + `DEVICE_SMOKE_TEST_PLAN.md`.

---

## 5. Core content modules (BLOCKER-HIGH)

| ID | Gate | Module | Expected | Pass | Owner |
|----|------|--------|----------|------|-------|
| RB-CNT-01 | Public read API | Announcements | 200 + data | ☐ | QA |
| RB-CNT-02 | Admin publish | Announcements | Mobile visible | ☐ | QA |
| RB-CNT-03 | Public read + RSVP | Events | RSVP hydrates | ☐ | QA |
| RB-CNT-04 | Public read + playback | Clips | Video plays ≥10s | ☐ | QA |
| RB-CNT-05 | Catalog + access control | eBooks/Library | Free/paid gates work | ☐ | QA |
| RB-CNT-06 | Plans API | Subscriptions | Plans returned | ☐ | QA |

---

## 6. Mobile application (BLOCKER-HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-MOB-01 | Release build compiles | `flutter build` | Success | ☐ | Mobile |
| RB-MOB-02 | Staging API configured | dart-define | Correct base URL | ☐ | Mobile |
| RB-MOB-03 | Firebase native config | google-services / plist | Present + bundle ID match | ☐ | Mobile |
| RB-MOB-04 | Critical journeys smoke | Mobile checklist Critical rows | All PASS | ☐ | QA |
| RB-MOB-05 | No startup crash | Cold launch ×3 | No crash | ☐ | QA |
| RB-MOB-06 | Store bundle ID | `com.ministrymobile.app` | Matches Firebase + stores | ☐ | Mobile |

---

## 7. Admin dashboard (BLOCKER-HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-ADM-01 | Admin login | Staging login | Dashboard loads | ☐ | QA |
| RB-ADM-02 | Content modules operational | Announcements, Events, Clips, eBooks | CRUD + publish PASS | ☐ | QA |
| RB-ADM-03 | Subscription management | Plan CRUD + subscribers | PASS | ☐ | QA |
| RB-ADM-04 | Payment visibility | Transaction list | PASS | ☐ | QA |
| RB-ADM-05 | `/content` placeholder | Known gap | ACCEPTED-RISK unless required | ☐ | Product |

---

## 8. Data & recovery (BLOCKER-HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-DR-01 | Backup configured | Postgres backup job | Documented schedule | ☐ | DevOps |
| RB-DR-02 | Restore drill | Restore to test instance | Success within RTO | ☐ | DevOps |
| RB-DR-03 | Rollback procedure | Documented + rehearsed | Team can execute | ☐ | DevOps |
| RB-DR-04 | Migration status | Prisma migrations | All applied | ☐ | Backend |

**Reference:** `docs/disaster-recovery.md`

---

## 9. Observability (BLOCKER-HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-OBS-01 | Prometheus scrapes | All targets up | 100% up | ☐ | DevOps |
| RB-OBS-02 | Alertmanager routing | Test alert | Routes to channel | ☐ | DevOps |
| RB-OBS-03 | Error tracking | Sentry DSN (if configured) | Errors captured | ☐ | Backend |
| RB-OBS-04 | Runbooks available | `docs/runbooks/*` | Team aware | ☐ | SRE |

---

## 10. Compliance & legal (BLOCKER-HIGH)

| ID | Gate | Validation | Expected | Pass | Owner |
|----|------|------------|----------|------|-------|
| RB-LGL-01 | Privacy policy accessible | Mobile + admin | Content loads | ☐ | Product |
| RB-LGL-02 | Terms of use accessible | Mobile | Content loads | ☐ | Product |
| RB-LGL-03 | Policy acceptance flow | New user | Acceptance recorded | ☐ | QA |
| RB-LGL-04 | Store listing metadata | `STORE_LISTING_METADATA.md` | Reviewed | ☐ | Product |

---

## Blocker summary worksheet

| Category | Total gates | PASS | FAIL | ACCEPTED-RISK |
|----------|-------------|------|------|---------------|
| Infrastructure | 8 | | | |
| Auth & security | 7 | | | |
| Payments | 6 | | | |
| Notifications | 6 | | | |
| Content modules | 6 | | | |
| Mobile | 6 | | | |
| Admin | 5 | | | |
| Data & recovery | 4 | | | |
| Observability | 4 | | | |
| Compliance | 4 | | | |
| **TOTAL** | **56** | | | |

---

## Go / no-go decision

| Decision | Criteria |
|----------|----------|
| **GO (staging)** | 0 BLOCKER-CRIT FAIL; ≤2 BLOCKER-HIGH with signed acceptance |
| **GO (production)** | 0 BLOCKER-CRIT FAIL; 0 BLOCKER-HIGH FAIL (unless executive acceptance) |
| **NO-GO** | Any BLOCKER-CRIT FAIL |

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Technical Lead | | | | ☐ GO ☐ NO-GO |
| QA Lead | | | | ☐ GO ☐ NO-GO |
| Product Owner | | | | ☐ GO ☐ NO-GO |
| DevOps Lead | | | | ☐ GO ☐ NO-GO |

### Accepted risks (if any)

| ID | Description | Owner | Expiry | Sign-off |
|----|-------------|-------|--------|----------|
| | | | | |

---

## Revision history

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-17 | Initial release blockers checklist |
