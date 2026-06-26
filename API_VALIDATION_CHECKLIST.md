# API Validation Checklist — WOP Ministry Platform

**Base URL:** `https://<host>/api/v1`  
**Auth header:** `Authorization: Bearer <access_token>`  
**Tools:** Postman, Bruno, `curl`, `services/validation-runner`  
**Companion:** `E2E_VALIDATION_PLAN.md`, `CONTRACT_MATRIX.md`

---

## How to use

1. Run **Health & infrastructure** first.
2. Obtain tokens via `/auth/login` for role-based tests.
3. Record: HTTP status, response body (redact PII/tokens), latency.
4. Mark: ☐ PASS · ☐ FAIL · ☐ BLOCKED · ☐ N/A
5. Severity: **Critical · High · Medium · Low**

### Test data setup

```bash
# Example: login and capture token
curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"qa.user@example.com","password":"<password>"}'
```

Maintain tokens for: `USER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`.

---

## 1. Health & infrastructure

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-H-01 | GET | `/health` | None | `200`, `{ status: "ok", service: "ministry-platform-api" }` | Critical | ☐ |
| API-H-02 | GET | `/metrics` | Bearer `METRICS_AUTH_TOKEN` (staging/prod) | `200`, Prometheus text | Medium | ☐ |
| API-H-03 | GET | `/realtime/health` | ADMIN JWT | `200`, connection stats | Medium | ☐ |
| API-H-04 | Invalid route | `/nonexistent` | None | `404` | Low | ☐ |
| API-H-05 | CORS preflight | `OPTIONS` from admin origin | None | Allowed origin in headers | High | ☐ |

**Evidence:** JSON response screenshot for API-H-01.

---

## 2. Authentication

| ID | Method | Endpoint | Body / headers | Expected | Severity | Pass |
|----|--------|----------|----------------|----------|----------|------|
| API-AUTH-01 | POST | `/auth/register` | Valid `{ email, password, fullName }` | `201`, tokens returned | Critical | ☐ |
| API-AUTH-02 | POST | `/auth/register` | Duplicate email | `409` | High | ☐ |
| API-AUTH-03 | POST | `/auth/login` | Valid credentials | `201`, access + refresh tokens | Critical | ☐ |
| API-AUTH-04 | POST | `/auth/login` | Wrong password | `401` | High | ☐ |
| API-AUTH-05 | POST | `/auth/refresh` | Valid `{ refreshToken }` | `201`, new access token | Critical | ☐ |
| API-AUTH-06 | POST | `/auth/refresh` | Invalid refresh token | `401` | High | ☐ |
| API-AUTH-07 | POST | `/auth/logout` | Valid refresh token | Session invalidated | High | ☐ |
| API-AUTH-08 | GET | `/auth/me` | USER JWT | `200`, user profile | Critical | ☐ |
| API-AUTH-09 | GET | `/auth/me` | No token | `401` | Critical | ☐ |
| API-AUTH-10 | POST | `/auth/forgot-password` | Registered email | `200/201` (SMTP configured) | High | ☐ |
| API-AUTH-11 | POST | `/auth/reset-password` | Valid reset token | Password updated | High | ☐ |
| API-AUTH-12 | POST | `/auth/login` | Rate limit (>5/min) | `429` | High | ☐ |

**Evidence:** Redacted token response for API-AUTH-03; 401 for API-AUTH-09.

---

## 3. Users

| ID | Method | Endpoint | Role | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-USR-01 | GET | `/users` | ADMIN | `200`, paginated list | High | ☐ |
| API-USR-02 | GET | `/users` | USER | `403` | Critical | ☐ |
| API-USR-03 | GET | `/users/:id` | ADMIN | `200`, user detail | Medium | ☐ |
| API-USR-04 | PATCH | `/users/:id/profile` | USER (self) | `200`, profile updated | Medium | ☐ |
| API-USR-05 | PATCH | `/users/:id/role` | ADMIN | `200`, role changed | High | ☐ |
| API-USR-06 | PATCH | `/users/:id/status` | ADMIN | `200`, status changed | High | ☐ |

---

## 4. Announcements

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-ANN-01 | GET | `/announcements/public` | None | `200`, published only | High | ☐ |
| API-ANN-02 | GET | `/announcements/public/:id` | None | `200`, detail | High | ☐ |
| API-ANN-03 | GET | `/announcements/public/categories` | None | `200`, categories | Low | ☐ |
| API-ANN-04 | POST | `/announcements/admin` | ADMIN | `201`, draft created | High | ☐ |
| API-ANN-05 | PATCH | `/announcements/admin/:id/publish` | ADMIN | `200`, published | High | ☐ |
| API-ANN-06 | PATCH | `/announcements/admin/:id/unpublish` | ADMIN | `200`, unpublished | High | ☐ |
| API-ANN-07 | DELETE | `/announcements/admin/:id` | ADMIN | `200/204` | Medium | ☐ |
| API-ANN-08 | POST | `/announcements/admin` | MODERATOR | `403` | High | ☐ |

---

## 5. Events

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-EVT-01 | GET | `/events/public` | None | `200`, paginated | High | ☐ |
| API-EVT-02 | GET | `/events/public/featured` | None | `200`, featured only | Medium | ☐ |
| API-EVT-03 | GET | `/events/public/:slugOrId` | None | `200`, event detail | High | ☐ |
| API-EVT-04 | POST | `/events/admin` | MODERATOR | `201`, event created | High | ☐ |
| API-EVT-05 | PATCH | `/events/admin/:id/publish` | MODERATOR | `200` | High | ☐ |
| API-EVT-06 | POST | `/events/:id/rsvp` | USER | `201`, attendee REGISTERED | High | ☐ |
| API-EVT-07 | DELETE | `/events/:id/rsvp` | USER | `200`, status CANCELLED + event payload | High | ☐ |
| API-EVT-08 | GET | `/events/me/:id/rsvp` | USER | `200`, `{ status }` hydrated | High | ☐ |
| API-EVT-09 | GET | `/events/me/rsvps` | USER | `200`, list of RSVPs | High | ☐ |
| API-EVT-10 | POST | `/events/:id/rsvp` | USER (full event) | `409` Conflict | Medium | ☐ |
| API-EVT-11 | GET | `/events/admin/:id/attendees` | MODERATOR | `200`, attendee list | Medium | ☐ |

---

## 6. Clips

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-CLP-01 | GET | `/clips/public` | None | `200` | High | ☐ |
| API-CLP-02 | GET | `/clips/public/featured` | None | `200` | Medium | ☐ |
| API-CLP-03 | GET | `/clips/public/:id` | None | `200` | High | ☐ |
| API-CLP-04 | POST | `/clips/admin` | MODERATOR | `201` | High | ☐ |
| API-CLP-05 | PATCH | `/clips/admin/:id/publish` | MODERATOR | `200` | High | ☐ |
| API-CLP-06 | PATCH | `/clips/admin/:id/unpublish` | MODERATOR | `200` | Medium | ☐ |

---

## 7. eBooks & library

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-EBK-01 | GET | `/ebooks` | USER | `200`, catalog | High | ☐ |
| API-EBK-02 | GET | `/ebooks/:id` | USER | `200`, detail | High | ☐ |
| API-EBK-03 | GET | `/ebooks/:id/access` | USER (no purchase) | `403` or paywall flag | High | ☐ |
| API-EBK-04 | GET | `/library` | USER | `200`, user library | High | ☐ |
| API-EBK-05 | GET | `/ebooks/:id/stream?token=` | Stream token | `200`, content stream | High | ☐ |
| API-EBK-06 | POST | `/ebooks/admin` | ADMIN | `201` | High | ☐ |
| API-EBK-07 | PATCH | `/ebooks/:id/progress` | USER | `200`, progress saved | Medium | ☐ |

---

## 8. Subscriptions

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-SUB-01 | GET | `/subscriptions/plans` | USER | `200`, active plans | Critical | ☐ |
| API-SUB-02 | GET | `/subscriptions/me` | USER | `200`, subscription or null | Critical | ☐ |
| API-SUB-03 | GET | `/subscriptions/status` | USER | `200`, status enum | High | ☐ |
| API-SUB-04 | POST | `/subscriptions/subscribe` | USER | Depends on flow (may redirect to checkout) | High | ☐ |
| API-SUB-05 | POST | `/subscriptions/cancel` | USER (active) | `200`, cancelled | High | ☐ |
| API-SUB-06 | GET | `/subscriptions/content/validate` | Token params | `200`, entitlement bool | Critical | ☐ |
| API-SUB-07 | POST | `/subscriptions/admin/plans` | ADMIN | `201` | High | ☐ |

---

## 9. Payments (Flutterwave)

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-PAY-01 | POST | `/payments/checkout/subscription` | USER | `201`, checkout URL + reference | Critical | ☐ |
| API-PAY-02 | POST | `/payments/checkout/ebook` | USER | `201`, checkout URL | Critical | ☐ |
| API-PAY-03 | GET | `/payments/status?providerReference=` | USER | `200`, status | Critical | ☐ |
| API-PAY-04 | GET | `/payments/history` | USER | `200`, transactions | High | ☐ |
| API-PAY-05 | POST | `/payments/webhooks/flutterwave` | `verif-hash` header | `200`, idempotent processing | Critical | ☐ |
| API-PAY-06 | POST | `/payments/webhooks/flutterwave` | Invalid hash | `401/403` | Critical | ☐ |
| API-PAY-07 | GET | `/payments/webhook-events` | ADMIN | `200`, audit log | High | ☐ |

See `PAYMENT_VALIDATION_CHECKLIST.md` for full payment E2E.

---

## 10. Notifications & push

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-NTF-01 | GET | `/notifications` | USER | `200`, list | High | ☐ |
| API-NTF-02 | GET | `/notifications/:id` | USER | `200`, detail | Medium | ☐ |
| API-NTF-03 | PATCH | `/notifications/:id/read-state` | USER | `200`, `isRead` updated | Medium | ☐ |
| API-NTF-04 | POST | `/notifications/broadcast` | ADMIN, `{ channel: "IN_APP" }` | `201` | High | ☐ |
| API-NTF-05 | POST | `/notifications/broadcast` | ADMIN, `{ channel: "PUSH" }` | `201` + FCM logs | Critical | ☐ |
| API-NTF-06 | POST | `/notifications/targeted` | ADMIN | `201` | High | ☐ |
| API-NTF-07 | POST | `/notifications/broadcast` | USER | `403` | Critical | ☐ |
| API-PUSH-01 | POST | `/push/device-token/register` | USER | `201`, token saved | Critical | ☐ |
| API-PUSH-02 | POST | `/push/device-token/refresh` | USER | `200` | High | ☐ |
| API-PUSH-03 | POST | `/push/device-token/revoke` | USER | `200` | Medium | ☐ |
| API-PUSH-04 | GET | `/push/my-devices` | USER | `200`, device list | Medium | ☐ |

---

## 11. Programs & mentorship

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-PRG-01 | GET | `/programs/public` | None | `200` | Medium | ☐ |
| API-PRG-02 | POST | `/programs/:id/enroll` | USER | `201` | Medium | ☐ |
| API-PRG-03 | GET | `/programs/me/:id/progress` | USER | `200` | Medium | ☐ |
| API-MNT-01 | GET | `/mentorship/public` | None | `200` | Medium | ☐ |
| API-MNT-02 | POST | `/mentorship/classes/:id/enroll` | USER | `201` | Medium | ☐ |

---

## 12. Policies

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-POL-01 | GET | `/policies/public/:type` | None | `200`, policy content | Medium | ☐ |
| API-POL-02 | GET | `/policies/me/status` | USER | `200`, acceptance status | High | ☐ |
| API-POL-03 | POST | `/policies/me/accept` | USER | `200` | High | ☐ |

---

## 13. Analytics

| ID | Method | Endpoint | Auth | Expected | Severity | Pass |
|----|--------|----------|------|----------|----------|------|
| API-ANL-01 | GET | `/analytics/summary` | ADMIN | `200` | Medium | ☐ |
| API-ANL-02 | GET | `/analytics/dashboard` | ADMIN | `200` | Medium | ☐ |
| API-ANL-03 | GET | `/analytics/summary` | USER | `403` | High | ☐ |

---

## 14. Security & RBAC regression

| ID | Test | Expected | Severity | Pass |
|----|------|----------|----------|------|
| API-SEC-01 | USER calls `POST /announcements/admin` | `403` | Critical | ☐ |
| API-SEC-02 | MODERATOR calls `PATCH /users/:id/role` | `403` | Critical | ☐ |
| API-SEC-03 | Expired JWT on protected route | `401` | Critical | ☐ |
| API-SEC-04 | SQL injection in search param | Safe handling; no 500 | High | ☐ |
| API-SEC-05 | Oversized payload | `413` or `400` | Medium | ☐ |

---

## Automated runner

```bash
cd services/validation-runner
node src/run-all.js
```

| Suite | Covers |
|-------|--------|
| infrastructure | Health, DB, Redis |
| auth | Register, login, refresh |
| websocket | Realtime connection |
| payments | Checkout smoke |
| notifications | Broadcast API |

**Evidence:** `artifacts/*.json` attached to release ticket.

---

## Sign-off

| Tester | Date | Environment | Critical FAILs | Recommendation |
|--------|------|-------------|----------------|----------------|
| | | | | ☐ Proceed ☐ Block |
