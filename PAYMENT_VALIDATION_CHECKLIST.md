# Payment Validation Checklist — WOPP

**Providers:** Apple In-App Purchase (iOS) and Google Play Billing (Android)  
**Product ID:** `wopp_premium_monthly`  
**Plan code:** `PREMIUM`  
**Card checkout:** Disabled (`410 CARD_CHECKOUT_DISABLED`)

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
| PAY-00 | `APPLE_SHARED_SECRET` set | iOS receipt verification enabled | Critical | ☐ |
| PAY-01 | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` set | Android purchase verification enabled | Critical | ☐ |
| PAY-02 | Product ID `wopp_premium_monthly` in App Store and Play Console | Store product matches API env | Critical | ☐ |
| PAY-03 | Card checkout disabled | `POST /payments/checkout/subscription` returns `410` | Critical | ☐ |
| PAY-04 | Test USER account logged in on mobile | JWT available for subscribe | High | ☐ |
| PAY-05 | Active `PREMIUM` plan in DB | `GET /subscriptions/plans` returns plan | High | ☐ |
| PAY-06 | Paid ebook published | Catalog shows paid item | High | ☐ |

### Store test accounts

Use App Store sandbox testers and Google Play license testers. Record account used on sign-off.

---

## 1. Subscription purchase flow

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-SUB-01 | Mobile: Subscriptions → subscribe with store billing | Apple/Google purchase sheet | Critical | Screenshot: checkout page | ☐ |
| PAY-SUB-02 | Complete sandbox/test purchase for `wopp_premium_monthly` | Success message; PREMIUM active | Critical | Success screen | ☐ |
| PAY-SUB-03 | `GET /subscriptions/me` | Active subscription with plan code `PREMIUM` | Critical | API response JSON | ☐ |
| PAY-SUB-04 | `GET /subscriptions/status` | Active / trialing status | Critical | API response | ☐ |
| PAY-SUB-05 | Access premium-gated content | `content/validate` returns entitled | Critical | Before/after access | ☐ |
| PAY-SUB-06 | Admin `/payments` history | Historical transaction rows still visible | High | Admin screenshot | ☐ |
| PAY-SUB-07 | `POST /payments/checkout/subscription` | `410 CARD_CHECKOUT_DISABLED` | Critical | API response | ☐ |

---

## 2. eBook purchase flow

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-EBK-01 | Mobile: open paid ebook → purchase | Card checkout is not offered | Critical | Store billing / access rules | ☐ |
| PAY-EBK-02 | `POST /payments/checkout/ebook` | `410 CARD_CHECKOUT_DISABLED` | Critical | API response | ☐ |
| PAY-EBK-03 | Open free ebook | Access granted | Critical | API 200 | ☐ |
| PAY-EBK-04 | My Library | Owned/free eBooks appear on shelf | High | Library screenshot | ☐ |
| PAY-EBK-05 | Open reader | PDF/stream loads | High | Reader screenshot | ☐ |
| PAY-EBK-06 | `GET /payments/history` | Historical transactions listed | Medium | API response | ☐ |

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
| PAY-REN-01 | Subscription with store auto-renew | Flag stored correctly | High | DB / API inspect | ☐ |
| PAY-REN-02 | Store-managed renewal (Apple/Google) | Subscription end date extended | High | Store + DB | ☐ |
| PAY-REN-03 | Failed store renewal | Grace period or expired per policy | High | Status transition log | ☐ |
| PAY-REN-04 | User disables auto-renew in store | No renewal at period end | Medium | Settings UI | ☐ |

---

## 5. Webhook security & idempotency

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-WH-01 | POST `/payments/webhooks/flutterwave` | `410 CARD_CHECKOUT_DISABLED`; no state change | Critical | API response | ☐ |
| PAY-WH-02 | GET `/payments/complete?tx_ref=` | `410 CARD_CHECKOUT_DISABLED` | Critical | API response | ☐ |
| PAY-WH-03 | Admin historical webhook-events | Existing rows remain readable | Medium | Admin view | ☐ |

**Evidence:** Redacted webhook payload + `push_delivery_log`-style payment audit row.

---

## 6. Negative & edge cases

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-NEG-01 | Cancel store purchase sheet | No entitlement | High | Failure screen | ☐ |
| PAY-NEG-02 | Abandon store checkout | No entitlement; can retry | Medium | Status remains inactive | ☐ |
| PAY-NEG-03 | Checkout without JWT | `401` | Critical | API response | ☐ |
| PAY-NEG-04 | Direct `POST /subscriptions/subscribe` for PREMIUM | `400 CHECKOUT_REQUIRED` | High | API response | ☐ |
| PAY-NEG-05 | eBook purchase without payment reference | `400 CHECKOUT_REQUIRED` | High | API response | ☐ |

---

## 7. Admin payment operations

| ID | Validation steps | Expected result | Severity | Evidence | Pass |
|----|------------------|-----------------|----------|----------|------|
| PAY-ADM-01 | Admin payments list loads | All staging transactions visible | High | Admin screenshot | ☐ |
| PAY-ADM-02 | Filter by failed status | Correct subset | Medium | Filter applied | ☐ |
| PAY-ADM-03 | Webhook events audit trail | Historical events remain visible | High | Admin screenshot | ☐ |

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
| Store billing mode | Apple IAP + Google Play |
| Critical FAILs | |
| Financial reconciliation | ☐ Approved by finance delegate |
| Recommendation | ☐ Proceed ☐ Block |

**Backend lead approval:** _________________ Date: _________
