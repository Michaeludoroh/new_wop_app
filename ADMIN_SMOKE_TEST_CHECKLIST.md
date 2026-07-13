# Admin Smoke Test Checklist — WOPP

**App:** Next.js admin dashboard (`apps/admin-web`)  
**Default port:** 3001  
**API base:** `NEXT_PUBLIC_API_BASE_URL` → `/api/v1`  
**Companion:** `E2E_VALIDATION_PLAN.md`, `ADMIN_PLATFORM_AUDIT_REPORT.md`

---

## How to use

- Test in **staging** with real API backend.
- Roles: execute role-specific rows with `SUPER_ADMIN`, `ADMIN`, and `MODERATOR` accounts where marked.
- Mark: ☐ PASS · ☐ FAIL · ☐ BLOCKED · ☐ N/A
- Severity on FAIL: **Critical · High · Medium · Low**
- Capture screenshots for all Critical/High cases.

---

## Pre-flight

| ID | Step | Expected | Severity | Evidence | Pass |
|----|------|----------|----------|----------|------|
| A-00 | Navigate to `/login` | Login form renders | Critical | Screenshot | ☐ |
| A-01 | Login as ADMIN | Redirect to dashboard | Critical | Dashboard | ☐ |
| A-02 | Verify JWT in network tab | Authorized API calls succeed | Critical | Network HAR (redacted) | ☐ |
| A-03 | Wrong password | Error; no session | High | Error message | ☐ |
| A-04 | MODERATOR login | Dashboard loads; nav filtered by role | High | Nav screenshot | ☐ |
| A-05 | USER credentials on `/login` | 403 or redirect if attempted admin route | Critical | 403 screen | ☐ |

### Test data

| Account | Role | Purpose |
|---------|------|---------|
| qa.admin@… | ADMIN | Primary admin tests |
| qa.super@… | SUPER_ADMIN | Role elevation tests |
| qa.mod@… | MODERATOR | Moderator-scoped modules |
| qa.user@… | USER | Negative RBAC tests |

---

## 1. Authentication & session

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-AUTH-01 | Login → refresh page | Session persists | Critical | Dashboard after refresh | ☐ |
| A-AUTH-02 | Logout | Redirect to `/login`; API calls 401 | High | Login page | ☐ |
| A-AUTH-03 | Expired token (clear storage) | Redirect to login on next API call | High | Login redirect | ☐ |
| A-AUTH-04 | `GET /auth/me` via browser devtools | Returns admin profile + role | Medium | Network response | ☐ |

---

## 2. Dashboard (`/`)

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-DASH-01 | Load dashboard as ADMIN | KPI cards / summary render | High | Dashboard | ☐ |
| A-DASH-02 | Realtime/analytics widgets (if present) | Data loads or empty state | Medium | Widget area | ☐ |

---

## 3. User management (`/users`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-USR-01 | List users | Paginated user table | High | Users list | ☐ |
| A-USR-02 | Search/filter user | Results match query | Medium | Filter applied | ☐ |
| A-USR-03 | Change user role (non-super) | Role updated; API 200 | High | Role change + confirm | ☐ |
| A-USR-04 | Disable/suspend user | Status updated | High | Status badge | ☐ |
| A-USR-05 | MODERATOR access `/users` | 403 or nav hidden | High | 403 / missing nav | ☐ |

---

## 4. Announcements (`/announcements`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-ANN-01 | List announcements | Admin list loads | High | List view | ☐ |
| A-ANN-02 | Create draft announcement | Saved; appears in list | High | Create form + list | ☐ |
| A-ANN-03 | Upload banner image | Image URL saved | Medium | Image preview | ☐ |
| A-ANN-04 | Publish announcement | `published: true`; mobile visible | High | Published badge | ☐ |
| A-ANN-05 | Unpublish | Removed from mobile public API | High | Unpublished state | ☐ |
| A-ANN-06 | Edit published announcement | Changes reflected on mobile | Medium | Edit form | ☐ |
| A-ANN-07 | Delete announcement | Removed from admin list | Medium | Confirm dialog | ☐ |

---

## 5. Events (`/events`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-EVT-01 | List events | Admin events table | High | Events list | ☐ |
| A-EVT-02 | Create event (RSVP required, capacity) | Event created with slug | High | Create form | ☐ |
| A-EVT-03 | Publish event | Visible on `GET /events/public` | High | Published toggle | ☐ |
| A-EVT-04 | View attendees | Attendee list with RSVP status | Medium | Attendees panel | ☐ |
| A-EVT-05 | Edit event title/date | Updates persist | Medium | Edit form | ☐ |
| A-EVT-06 | Unpublish / delete | Removed from public API | Medium | Unpublished/deleted | ☐ |

---

## 6. Clips (`/clips`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-CLP-01 | List clips | Admin list loads | High | Clips list | ☐ |
| A-CLP-02 | Create clip with video URL | Clip saved | High | Create form | ☐ |
| A-CLP-03 | Publish clip | Mobile clips API returns item | High | Published state | ☐ |
| A-CLP-04 | Mark featured | Appears in featured endpoint | Medium | Featured flag | ☐ |
| A-CLP-05 | Unpublish | Removed from mobile | Medium | Unpublished | ☐ |
| A-CLP-06 | Edit / delete | Changes persist | Medium | Edit/delete confirm | ☐ |

---

## 7. eBooks (`/ebooks`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-EBK-01 | List ebooks | Admin catalog | High | eBooks list | ☐ |
| A-EBK-02 | Upload ebook (file + metadata) | Upload succeeds | High | Upload progress + success | ☐ |
| A-EBK-03 | Set price (paid ebook) | Price saved | High | Pricing fields | ☐ |
| A-EBK-04 | Publish ebook | Mobile catalog shows item | High | Published badge | ☐ |
| A-EBK-05 | Unpublish | Access blocked on mobile | Medium | Unpublished | ☐ |

---

## 8. Subscriptions (`/subscriptions`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-SUB-01 | List subscription plans | Plans table | Critical | Plans list | ☐ |
| A-SUB-02 | Create plan | Plan code unique; saved | Critical | Create plan form | ☐ |
| A-SUB-03 | Edit plan pricing | Mobile plans API updated | High | Edit form | ☐ |
| A-SUB-04 | View subscribers | Subscriber list loads | High | Subscribers tab | ☐ |
| A-SUB-05 | Lifecycle action (cancel/suspend) | User entitlement updated | Critical | Lifecycle confirm | ☐ |
| A-SUB-06 | Deactivate plan | Not offered on mobile checkout | High | Inactive plan | ☐ |

---

## 9. Payments (`/payments`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-PAY-01 | Payment history list | Transactions displayed | High | Payments list | ☐ |
| A-PAY-02 | Filter by status/date | Filters work | Medium | Filter applied | ☐ |
| A-PAY-03 | Webhook events audit | Webhook log entries visible | High | Webhook events tab | ☐ |
| A-PAY-04 | Cross-check mobile purchase | Admin record matches mobile txn | Critical | Matching reference IDs | ☐ |

---

## 10. Notifications (`/notifications`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-NTF-01 | List notifications feed | Feed loads | High | Feed list | ☐ |
| A-NTF-02 | Create IN_APP broadcast | Success; appears in feed | High | Broadcast form | ☐ |
| A-NTF-03 | Create PUSH broadcast | API logs show FCM dispatch | Critical | Form + API logs | ☐ |
| A-NTF-04 | Create targeted notification | Only target user affected | High | Targeted form | ☐ |
| A-NTF-05 | Mark read state (if UI supports) | Read badge updates | Medium | Read state | ☐ |

---

## 11. Programs (`/programs`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-PRG-01 | List / create / publish program | Mobile public API shows program | Medium | Program admin UI | ☐ |
| A-PRG-02 | View enrollments / analytics | Data loads | Low | Analytics panel | ☐ |

---

## 12. Mentorship (`/mentorship`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-MNT-01 | Create class / session | Saved successfully | Medium | Class form | ☐ |
| A-MNT-02 | Publish / manage attendance | Mobile list updated | Medium | Session list | ☐ |

---

## 13. Policies (`/policies`) — MODERATOR+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-POL-01 | List policies | All policy types shown | Medium | Policies list | ☐ |
| A-POL-02 | Publish policy update | Mobile policy viewer shows new content | Medium | Editor + mobile | ☐ |

---

## 14. Analytics (`/analytics`) — ADMIN+

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-ANL-01 | Load analytics dashboard | Charts/tables render | Medium | Analytics page | ☐ |
| A-ANL-02 | Date range filter | Data updates | Low | Filter applied | ☐ |

---

## 15. Content hub (`/content`) — KNOWN GAP

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-CNT-01 | Navigate to `/content` | **Currently placeholder only** | Low | Placeholder page | ☐ N/A |

> **Note:** Do not fail release solely on `/content` placeholder unless product requires unified content hub for launch.

---

## 16. Status page (`/status`) — optional

| ID | Steps | Expected result | Severity | Screenshot | Pass |
|----|-------|-----------------|----------|------------|------|
| A-STS-01 | Load `/status` | Page renders (static or live data) | Low | Status page | ☐ |

---

## RBAC matrix (quick reference)

| Route | SUPER_ADMIN | ADMIN | MODERATOR | USER |
|-------|:-----------:|:-----:|:---------:|:----:|
| `/users` | ✓ | ✓ | ✗ | ✗ |
| `/subscriptions`, `/payments`, `/ebooks` | ✓ | ✓ | ✗ | ✗ |
| `/announcements` | ✓ | ✓ | ✗ | ✗ |
| `/events`, `/clips`, `/programs`, `/mentorship`, `/policies`, `/notifications` | ✓ | ✓ | ✓ | ✗ |
| `/analytics` | ✓ | ✓ | ✗ | ✗ |

---

## Session sign-off

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Browser / version | |
| Environment | |
| PASS / FAIL counts | |
| Critical failures | |
| Recommendation | ☐ Proceed ☐ Block |

**QA Lead approval:** _________________ Date: _________
