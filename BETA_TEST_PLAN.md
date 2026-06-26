# Closed Beta Test Plan

**Version:** 1.0  
**Date:** 2026-06-19  
**Audience:** QA, engineering, beta coordinators  
**Prerequisites:** All **Gate** items in `CLOSED_BETA_CHECKLIST.md` cleared on staging

---

## 1. Objectives

Validate end-to-end platform behavior with a limited tester cohort before public release:

1. Core user journeys (auth, content, subscriptions, admin operations)
2. Infrastructure reliability (deploy, health, persistence, realtime)
3. External integrations scoped for beta (SMTP, Flutterwave, FCM)
4. Mobile + admin + API consistency under real network conditions

---

## 2. Scope

### In scope

| Surface | Build / URL |
|---------|-------------|
| API | Staging/production HTTPS base (`/api/v1`) |
| Admin dashboard | Staging admin URL |
| Mobile (Flutter) | Beta APK/IPA or TestFlight with `--dart-define=API_BASE_URL=...` |
| Realtime | Socket.IO on API host (`/realtime`) |
| Uploads | Clips, ebook covers, announcements |

### Out of scope (unless explicitly enabled)

- Stripe / Paystack (Flutterwave is primary)
- Multi-region failover
- Load testing beyond ~50 concurrent beta users
- App store public release

### Beta feature flags / waivers

Document any waived integrations before testing:

| Integration | Beta status | Fallback behavior |
|-------------|---------------|-------------------|
| Flutterwave | ☐ Enabled ☐ Waived | Checkout disabled |
| SMTP | ☐ Enabled ☐ Waived | Mock email (no delivery) |
| FCM push | ☐ Enabled ☐ Waived | In-app notifications only |

---

## 3. Test environments

| Environment | Purpose | URL placeholder |
|-------------|---------|-----------------|
| Staging | Primary beta target | `https://staging-api.<domain>/api/v1` |
| Admin staging | Admin testers | `https://staging-admin.<domain>` |
| Production | Optional late beta | Only after staging gate cleared |

**Mobile build command:**

```bash
node scripts/beta/build-mobile-staging.mjs https://staging-api.<domain>/api/v1
# Then run printed flutter build/run commands
```

---

## 4. Entry criteria

- [ ] `CLOSED_BETA_CHECKLIST.md` gate items signed off
- [ ] Staging health: `GET /api/v1/health` → 200
- [ ] Admin can log in with seeded admin account
- [ ] Beta tester accounts provisioned (or self-registration enabled)
- [ ] `BETA_FEEDBACK_TEMPLATE.md` distributed to testers
- [ ] Support channel defined (email, Slack, etc.)

---

## 5. Test phases

### Phase A — Infrastructure smoke (engineering, Day 0)

| ID | Test | Steps | Expected | Owner |
|----|------|-------|----------|-------|
| INF-A1 | API health | `curl $API/api/v1/health` | 200, dependencies OK | DevOps |
| INF-A2 | Admin health | Load admin URL | Login page renders | DevOps |
| INF-A3 | Email health | `GET /api/v1/health/email` | configured or mock documented | Backend |
| INF-A4 | Flutterwave health | `GET /api/v1/health/flutterwave` | configured or waived | Backend |
| INF-A5 | Postgres backup | `node scripts/backup/postgres-backup.mjs` | Non-empty `.sql.gz` | DevOps |
| INF-A6 | Upload persistence | Upload clip → restart `api` → asset URL loads | Asset survives restart | Backend |
| INF-A7 | WebSocket connect | Admin open realtime panel; mobile login | Connect without errors | Full-stack |
| INF-A8 | Rollback drill | Deploy tag N → rollback to N-1 → health | Previous version healthy | DevOps |

### Phase B — Admin journeys (Day 1–2)

| ID | Journey | Steps | Pass criteria |
|----|---------|-------|---------------|
| ADM-B1 | Admin login | Valid credentials | Dashboard loads, no 403 loop |
| ADM-B2 | User management | List users, view subscriber detail | Data matches API |
| ADM-B3 | Content hub | Create/edit announcement, clip metadata | Saves and appears in list |
| ADM-B4 | Clip upload | Upload short video clip | Processing completes; thumbnail visible |
| ADM-B5 | Ebook upload | Upload ebook + cover | Appears in catalog |
| ADM-B6 | Realtime notification | Publish announcement | Mobile/admin receive in-app event (if connected) |
| ADM-B7 | RBAC | Non-admin user cannot access admin | 403 / redirect |

Reference: `ADMIN_SMOKE_TEST_CHECKLIST.md`

### Phase C — Mobile journeys (Day 1–3)

| ID | Journey | Steps | Pass criteria |
|----|---------|-------|---------------|
| MOB-C1 | Login / logout | Email + password | Token persisted; logout clears session |
| MOB-C2 | Profile | View/edit profile | Changes persist after restart |
| MOB-C3 | Content browse | Announcements, clips, ebooks | Lists load; detail screens work |
| MOB-C4 | Ebook stream | Open premium ebook | Stream token works; no direct PDF leak |
| MOB-C5 | Clip playback | Play clip | Video loads from upload storage |
| MOB-C6 | Push (if enabled) | Receive test announcement | Notification on device; tap opens content |
| MOB-C7 | Realtime | Keep app foreground during admin publish | In-app notification updates |
| MOB-C8 | Offline / poor network | Airplane mode toggle | Graceful errors, recovery on reconnect |

Reference: `DEVICE_SMOKE_TEST_PLAN.md`

### Phase D — Payments (if enabled, Day 2–4)

| ID | Journey | Steps | Pass criteria |
|----|---------|-------|---------------|
| PAY-D1 | Subscription checkout | Start checkout from mobile/web | Redirect to Flutterwave hosted page |
| PAY-D2 | Successful payment | Complete sandbox payment | Webhook received; subscription ACTIVE |
| PAY-D3 | Failed payment | Cancel or fail payment | Transaction FAILED; no entitlement |
| PAY-D4 | Ebook purchase | One-time ebook checkout | Entitlement granted after verify |
| PAY-D5 | Webhook replay | Duplicate webhook | Idempotent; no double entitlement |

Use Flutterwave **sandbox** keys for beta unless explicitly approved for live.

### Phase E — Email (if enabled, Day 2)

| ID | Journey | Steps | Pass criteria |
|----|---------|-------|---------------|
| EML-E1 | Password reset request | Trigger forgot password | Email received within 5 min |
| EML-E2 | Reset link | Click link in email | Password change succeeds |
| EML-E3 | Welcome / notification email | Admin-triggered email flow | Correct `APP_NAME`, links use `WEB_APP_URL` |

### Phase F — Beta tester exploratory (Day 3–14)

- Testers execute journeys in `BETA_FEEDBACK_TEMPLATE.md`
- Minimum 5 testers per platform (Android + iOS if both in scope)
- Daily triage of feedback tags: **blocker**, **major**, **minor**, **enhancement**

---

## 6. Exit criteria

| Criterion | Target |
|-----------|--------|
| P0 defects open | 0 |
| P1 defects open | 0 (or documented waivers with mitigation) |
| Infrastructure smoke (Phase A) | 100% pass |
| Core journeys (B + C) | ≥95% pass |
| Payment journeys (if in scope) | 100% pass on sandbox |
| Tester-reported blockers | Resolved or waived by product owner |
| Backup restore drill | At least one successful staging restore logged |

---

## 7. Defect severity (beta)

| Severity | Definition | Response |
|----------|------------|----------|
| **P0 Blocker** | Data loss, auth bypass, payment double-charge, total outage | Fix before continuing beta |
| **P1 Major** | Core journey broken for majority of users | Fix within 48h |
| **P2 Minor** | Workaround exists; cosmetic or edge case | Track for post-beta |
| **Enhancement** | Feature request | Backlog |

---

## 8. Monitoring during beta

| Signal | Source | Action threshold |
|--------|--------|------------------|
| API 5xx rate | Logs / metrics (`METRICS_AUTH_TOKEN`) | >1% over 15 min → investigate |
| Health endpoints | Cron or uptime check | Any non-200 → page on-call |
| Flutterwave webhooks | API logs + dashboard | Missing webhooks >30 min after payment |
| FCM failures | `PushNotification` logs | Spike in invalid token revocations |
| Disk / uploads volume | Host monitoring | >80% capacity → expand or prune |

---

## 9. Rollback trigger

Initiate `ROLLBACK_RUNBOOK.md` if:

- Sustained API health failure after deploy
- Auth or payment regression affecting all users
- Data corruption detected in postgres or uploads

Database rollback remains **forward-only** — prefer hotfix deploy over schema downgrade.

---

## 10. Schedule template

| Day | Activity | Participants |
|-----|----------|--------------|
| D-2 | Complete checklist gates, staging deploy | DevOps + Backend |
| D-1 | Phase A smoke + mobile build distribution | Engineering |
| D0 | Phase B/C internal pass | QA + Engineering |
| D1 | Invite cohort 1 (5–10 testers) | Product |
| D3 | Triage + hotfix deploy if needed | Engineering |
| D7 | Mid-beta review | Product + Engineering |
| D14 | Exit review + GO/NO-GO for wider release | All stakeholders |

---

## 11. Validation commands reference

```bash
# Environment
node scripts/env/validate-production-secrets.mjs --mode=staging
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-pre-beta.mjs

# Health
node scripts/deploy/verify-health.mjs

# Mobile Firebase
node scripts/beta/validate-mobile-firebase.mjs

# Backups
node scripts/backup/postgres-backup.mjs
node scripts/backup/validate-restore.mjs --postgres=infra/postgres/backups/<latest>.sql.gz
```

---

## Related documents

- `CLOSED_BETA_CHECKLIST.md`
- `BETA_FEEDBACK_TEMPLATE.md`
- `ADMIN_SMOKE_TEST_CHECKLIST.md`
- `DEVICE_SMOKE_TEST_PLAN.md`
- `DEPLOYMENT_RUNBOOK.md`
- `ROLLBACK_RUNBOOK.md`
