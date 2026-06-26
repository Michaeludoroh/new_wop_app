# Mobile Smoke Test Checklist — WOP Ministry Platform

**App:** Flutter (`apps/mobile-flutter`)  
**Bundle ID:** `com.ministrymobile.app`  
**Build:** `--dart-define=API_BASE_URL=https://<staging>/api/v1`  
**Companion:** `E2E_VALIDATION_PLAN.md`, `DEVICE_SMOKE_TEST_PLAN.md`

---

## How to use

1. Complete **Pre-flight** before any test session.
2. Execute sections in order for first-run; subsequent runs may target changed modules only.
3. Mark each row: ☐ PASS · ☐ FAIL · ☐ BLOCKED · ☐ N/A
4. Assign severity on FAIL using: **Critical · High · Medium · Low**
5. Attach evidence per **Evidence** column.

---

## Pre-flight (all Critical)

| ID | Step | Expected result | Severity | Evidence | Pass |
|----|------|-----------------|----------|----------|------|
| MF-00 | Install staging build on test device | App launches without crash | Critical | Screenshot: splash/home | ☐ |
| MF-01 | Confirm `API_BASE_URL` points to staging | Network calls hit staging (Charles/Logcat) | Critical | Log snippet | ☐ |
| MF-02 | Staging API `GET /health` returns 200 | `{ status: "ok" }` | Critical | API response | ☐ |
| MF-03 | Test accounts available (see test data sheet) | Login succeeds for QA user | Critical | Screenshot: login | ☐ |
| MF-04 | Device has network connectivity | API calls succeed | Critical | — | ☐ |
| MF-05 | Record device model, OS version, build number | Logged on sign-off sheet | Low | Sign-off row | ☐ |

### Test data requirements

| Data | Source |
|------|--------|
| QA user (USER role) | Staging test data sheet |
| QA admin (for push tests) | Staging test data sheet |
| Published announcement, event, clip, ebook | Admin pre-seeded or created during admin smoke |
| Flutterwave sandbox (subscriptions/ebooks) | `PAYMENT_VALIDATION_CHECKLIST.md` |

---

## 1. Authentication

| ID | Validation steps | Expected result | Severity | Screenshot / evidence | Pass |
|----|------------------|-----------------|----------|----------------------|------|
| M-AUTH-01 | Open app logged out → Register with new email | 201; lands on dashboard or policy gate | Critical | Register success + dashboard | ☐ |
| M-AUTH-02 | Logout → Login with valid credentials | Dashboard loads; user name/email visible | Critical | Login + dashboard | ☐ |
| M-AUTH-03 | Login with wrong password | Error message; no session | High | Error toast/dialog | ☐ |
| M-AUTH-04 | Background app 20+ min; return | Session persists (refresh) OR clean re-login prompt | High | — | ☐ |
| M-AUTH-05 | Logout | Returns to auth landing; protected tabs blocked | High | Auth landing screen | ☐ |
| M-AUTH-06 | Forgot password → check email → reset | Reset link works; new password login succeeds | High | Email + reset screen | ☐ |
| M-AUTH-07 | Open `/profile` while authenticated | Profile data matches `/auth/me` | Medium | Profile screen | ☐ |

---

## 2. Dashboard & navigation

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-NAV-01 | Tap each bottom tab: Dashboard, Events, Clips, Library, More | Each tab loads without error | High | 5 tab screenshots | ☐ |
| M-NAV-02 | More → Programs, Mentorship, Announcements, Subscriptions | Routes open correctly | Medium | More menu + each screen | ☐ |
| M-NAV-03 | Pull-to-refresh on list screens | Data refreshes; no duplicate crash | Medium | — | ☐ |

---

## 3. Announcements

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-ANN-01 | More → Announcements | Published announcements listed | High | List view | ☐ |
| M-ANN-02 | Tap announcement | Detail shows title, body, date | High | Detail view | ☐ |
| M-ANN-03 | Admin publishes new announcement (coord with admin QA) | Appears after refresh | High | Before/after list | ☐ |
| M-ANN-04 | Admin unpublishes | Removed from list after refresh | Medium | List after unpublish | ☐ |

---

## 4. Events

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-EVT-01 | Events tab → list loads | Published events shown | High | Events list | ☐ |
| M-EVT-02 | Open event detail | Title, date, location, attendee count | High | Detail screen | ☐ |
| M-EVT-03 | RSVP (registration required event) | Button → Cancel RSVP; count increments | High | RSVP confirmed state | ☐ |
| M-EVT-04 | Kill app; reopen same event | Cancel RSVP still shown (hydrated) | High | Detail after cold start | ☐ |
| M-EVT-05 | Cancel RSVP | Button → RSVP; count decrements | High | Cancelled state | ☐ |
| M-EVT-06 | Return to list after RSVP | Green calendar icon on card | High | List with RSVP icon | ☐ |
| M-EVT-07 | Featured events carousel | Featured events visible horizontally | Medium | Featured row | ☐ |
| M-EVT-08 | Search / category filter | Results filter correctly | Low | Filter applied | ☐ |

---

## 5. Clips

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-CLP-01 | Clips tab → list loads | Published clips shown | High | Clips list | ☐ |
| M-CLP-02 | Open clip detail | Metadata visible | High | Detail screen | ☐ |
| M-CLP-03 | Play video ≥10 seconds | Playback smooth; no immediate error | High | **Video mid-playback** | ☐ |
| M-CLP-04 | Pause / resume | Controls respond | Medium | Paused frame | ☐ |
| M-CLP-05 | Featured clips section | Featured clips in carousel | Medium | Featured row | ☐ |
| M-CLP-06 | Background app during playback | Returns without crash | Medium | — | ☐ |

---

## 6. Library / eBooks

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-LIB-01 | Library tab → catalog | eBooks listed | High | eBooks list | ☐ |
| M-LIB-02 | Open free ebook | Reader opens | High | Reader view | ☐ |
| M-LIB-03 | Open paid ebook (no purchase) | Purchase prompt or access denied | High | Paywall / denied | ☐ |
| M-LIB-04 | Complete purchase (Flutterwave test) | eBook in My Library; reader opens | Critical | Library + reader | ☐ |
| M-LIB-05 | Read partial; close; reopen | Progress restored | Medium | Progress indicator | ☐ |
| M-LIB-06 | My Library shelf | Purchased items listed | High | My Library | ☐ |

---

## 7. Subscriptions

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-SUB-01 | More → Subscriptions | Plans displayed with prices | High | Plans screen | ☐ |
| M-SUB-02 | Subscribe (Flutterwave test card) | Redirect → success → active status | Critical | Checkout + active badge | ☐ |
| M-SUB-03 | Access premium-gated content | Content unlocked while active | Critical | Before/after access | ☐ |
| M-SUB-04 | Cancel subscription | Status shows cancelled/pending expiry | High | Cancel confirmation | ☐ |
| M-SUB-05 | After expiry (simulated or waited) | Gated content blocked | High | Access denied | ☐ |

---

## 8. Notifications

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-NTF-01 | Grant notification permission on first prompt | Permission granted | High | OS permission dialog | ☐ |
| M-NTF-02 | Login → token registered | (Backend) row in `push_device_token` | Critical | DB query or admin log | ☐ |
| M-NTF-03 | Admin broadcast PUSH | Push received on device | Critical | **Notification tray** | ☐ |
| M-NTF-04 | Tap push (background) | App opens correct screen | High | Destination screen | ☐ |
| M-NTF-05 | Notifications screen → list | In-app notifications visible | High | Notifications list | ☐ |
| M-NTF-06 | Mark notification read | Read state persists on refresh | Medium | Read vs unread | ☐ |
| M-NTF-07 | Cold start from push tap | Deep link resolves (see push fix) | High | Cold start destination | ☐ |

---

## 9. Programs & Mentorship

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-PRG-01 | Programs list | Published programs shown | Medium | Programs list | ☐ |
| M-PRG-02 | Enroll in program | Enrolled state on detail | Medium | Enrolled button state | ☐ |
| M-MNT-01 | Mentorship list + detail | Classes/sessions visible | Medium | Mentorship screens | ☐ |
| M-MNT-02 | Enroll in class | Enrollment confirmed | Medium | Enrolled state | ☐ |

---

## 10. Policies

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-POL-01 | First login policy gate (if shown) | Must accept to proceed | High | Policy modal | ☐ |
| M-POL-02 | Profile/More → Terms, Privacy | Policy content loads | Medium | Policy viewer | ☐ |

---

## 11. Profile & session edge cases

| ID | Validation steps | Expected result | Severity | Screenshot | Pass |
|----|------------------|-----------------|----------|------------|------|
| M-EDGE-01 | Airplane mode → open app | Graceful offline message | Medium | Offline state | ☐ |
| M-EDGE-02 | Expired/invalid token | Redirect to login | High | Login prompt | ☐ |
| M-EDGE-03 | Rotate device on reader/video | Layout adapts | Low | Landscape screenshot | ☐ |

---

## Session sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Build (#) | |
| Device / OS | |
| Environment | ☐ Staging ☐ Production smoke |
| Total PASS | / |
| Total FAIL | / |
| Critical FAILs | |
| Release recommendation | ☐ Proceed ☐ Block |

**QA Lead approval:** _________________ Date: _________
