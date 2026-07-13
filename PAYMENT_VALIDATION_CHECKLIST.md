# Payment Validation Checklist — WOPP

**Provider:** Flutterwave (only registered provider)  
**Webhook:** `POST /api/v1/payments/webhooks/flutterwave`  
**Checkout:** Subscription + eBook  
**Companion:** `PAYMENT_IMPLEMENTATION_REPORT.md`, `PAYMENT_TEST_REPORT.md`, `WEBHOOK_SECURITY_REPORT.md`

---

## Severity guide

| Severity | Examples |
|----------|----------|
| **Critical** | Double charge, entitlement not granted after success, webhook spoof accepted, secret key exposed |
| **High** | Checkout fails, status poll wrong, cancel doesn't revoke access |
| **Medium** | History pagination, receipt email missing |
| **Low** | UI copy, formatting |

---

## Pre-flight

| ID | Requirement | Expected | Severity | Pass |
|----|-------------|----------|----------|------|
| PAY-00 | `FLUTTERWAVE_SECRET_KEY` set (sandbox for staging) | API boots; checkout creates session | Critical | ☐ |
| PAY-01 | `FLUTTERWAVE_WEBHOOK_SECRET` set | Webhook verification enabled | Critical | ☐ |
| PAY-02 | `PAYMENT_REDIRECT_BASE_URL` matches staging API | Redirect after payment succeeds | Critical | ☐ |
| PAY-03 | Flutterwave dashboard webhook URL configured | Points to staging webhook endpoint | Critical | ☐ |
| PAY-04 | Test USER account logged in on mobile | JWT available for checkout | High | ☐ |
| PAY-05 | Active subscription plan in DB | `GET /subscriptions/plans` returns plan | High | ☐ |
| PAY-06 | Paid ebook published | Catalog shows paid item | High | ☐ |

### Flutterwave test cards (sandbox)

Reference [Flutterwave test documentation](https://developer.flutterwave.com/docs/test-cards). Record card used on sign-off.

| Scenario | Card behavior | Use for |
|----------|---------------|---------|
| Successful payment | Approved test card | PAY-SUB-01, PAY-EBK-01 |
| Declined payment | Decline test card | PAY-NEG-01 |
| Insufficient funds | Decline variant | PAY-NEG-02 |

---

## 1. Subscription purchase flow

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-SUB-01 | Mobile: Subscriptions → select plan → checkout | Redirect to Flutterwave hosted page | Critical | Screenshot: checkout page | ☐ |
| PAY-SUB-02 | Complete payment with success test card | Redirect back; success message | Critical | Success screen | ☐ |
| PAY-SUB-03 | `GET /payments/status?providerReference=` | `status: successful` (or equivalent) | Critical | API response JSON | ☐ |
| PAY-SUB-04 | `GET /subscriptions/me` | Active subscription with plan code | Critical | API response JSON | ☐ |
| PAY-SUB-05 | `GET /subscriptions/status` | Active / trialing status | Critical | API response | ☐ |
| PAY-SUB-06 | Access premium-gated content | `content/validate` returns entitled | Critical | Before/after access | ☐ |
| PAY-SUB-07 | Admin `/payments` history | Transaction row with matching reference | High | Admin screenshot | ☐ |
| PAY-SUB-08 | Webhook event logged | Entry in `webhook-events` admin view | High | Admin webhook log | ☐ |

---

## 2. eBook purchase flow

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-EBK-01 | Mobile: open paid ebook → purchase | Checkout URL returned | Critical | Checkout redirect | ☐ |
| PAY-EBK-02 | Complete Flutterwave payment | Success redirect | Critical | Success screen | ☐ |
| PAY-EBK-03 | `GET /ebooks/:id/access` | Access granted | Critical | API 200 | ☐ |
| PAY-EBK-04 | My Library | eBook appears on shelf | High | Library screenshot | ☐ |
| PAY-EBK-05 | Open reader | PDF/stream loads | High | Reader screenshot | ☐ |
| PAY-EBK-06 | `GET /payments/history` | eBook transaction listed | Medium | API response | ☐ |

---

## 3. Entitlement lifecycle

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-ENT-01 | Active subscription → access gated resource | Allowed | Critical | Access granted | ☐ |
| PAY-ENT-02 | User cancels subscription (`POST /subscriptions/cancel`) | Status cancelled / pending expiry | High | API + mobile UI | ☐ |
| PAY-ENT-03 | After subscription period ends | Gated content blocked | Critical | Access denied | ☐ |
| PAY-ENT-04 | Admin lifecycle cancel on subscriber | Entitlement revoked per policy | Critical | Admin action + mobile | ☐ |
| PAY-ENT-05 | Re-subscribe after lapse | Entitlement restored | High | Active status again | ☐ |
| PAY-ENT-06 | Duplicate checkout same plan (active sub) | Prevented or idempotent | High | Error or no double charge | ☐ |

---

## 4. Renewal flow

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-REN-01 | Subscription with `autoRenew: true` | Flag stored correctly | High | DB / API inspect | ☐ |
| PAY-REN-02 | Simulate renewal webhook (Flutterwave sandbox) | Subscription end date extended | High | Webhook payload + DB | ☐ |
| PAY-REN-03 | Failed renewal webhook | Grace period or expired per policy | High | Status transition log | ☐ |
| PAY-REN-04 | User disables auto-renew | No renewal at period end | Medium | Settings UI | ☐ |

---

## 5. Webhook security & idempotency

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-WH-01 | POST webhook with valid `verif-hash` | `200`; payment processed | Critical | Server log | ☐ |
| PAY-WH-02 | POST webhook with invalid hash | `401/403`; no state change | Critical | Server log | ☐ |
| PAY-WH-03 | Replay same webhook payload twice | Idempotent; single entitlement grant | Critical | DB count unchanged | ☐ |
| PAY-WH-04 | Webhook for unknown reference | Logged; no crash | Medium | Error log | ☐ |
| PAY-WH-05 | Webhook delayed (poll succeeds first) | No duplicate entitlement | High | Status + webhook order test | ☐ |

**Evidence:** Redacted webhook payload + `push_delivery_log`-style payment audit row.

---

## 6. Negative & edge cases

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-NEG-01 | Declined test card at checkout | User returned with failure; no entitlement | High | Failure screen | ☐ |
| PAY-NEG-02 | Abandon checkout (close browser) | No entitlement; can retry | Medium | Status remains inactive | ☐ |
| PAY-NEG-03 | Checkout without JWT | `401` | Critical | API response | ☐ |
| PAY-NEG-04 | Checkout for inactive plan | `400/404` | High | API response | ☐ |
| PAY-NEG-05 | eBook already purchased → checkout again | Prevented or idempotent | High | API response | ☐ |

---

## 7. Admin payment operations

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-ADM-01 | Admin payments list loads | All staging transactions visible | High | Admin screenshot | ☐ |
| PAY-ADM-02 | Filter by failed status | Correct subset | Medium | Filter applied | ☐ |
| PAY-ADM-03 | Webhook events audit trail | Matches Flutterwave dashboard | High | Side-by-side compare | ☐ |

---

## 8. Data integrity checks (SQL)

Run after successful purchase (redact in evidence):

```sql
-- Subscription entitlement
SELECT * FROM "Subscription" WHERE "userId" = '<qa-user-id>' ORDER BY "createdAt" DESC LIMIT 1;

-- Payment record
SELECT * FROM "PaymentTransaction" WHERE "userId" = '<qa-user-id>' ORDER BY "createdAt" DESC LIMIT 1;

-- eBook purchase
SELECT * FROM "EbookPurchase" WHERE "userId" = '<qa-user-id>' ORDER BY "createdAt" DESC LIMIT 1;
```

| ID | Check | Expected | Severity | Pass |
|----|-------|----------|----------|------|
| PAY-DB-01 | Payment row exists with correct amount/currency | Matches plan/ebook price | Critical | ☐ |
| PAY-DB-02 | Subscription dates align with plan duration | start < end | Critical | ☐ |
| PAY-DB-03 | No orphan payments (success without entitlement) | 0 rows | Critical | ☐ |

---

## Sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Environment | ☐ Sandbox ☐ Production smoke |
| Flutterwave mode | |
| Critical FAILs | |
| Financial reconciliation | ☐ Approved by finance delegate |
| Recommendation | ☐ Proceed ☐ Block |

**Backend lead approval:** _________________ Date: _________
