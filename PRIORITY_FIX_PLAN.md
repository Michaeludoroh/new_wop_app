# WOP Ministry Platform — Priority Fix Plan

**Date:** 2026-06-19  
**Status:** P0 and P1 remediation **complete** · P2/P3 backlog documented

---

## Phase 1 — P0 production blockers ✅ COMPLETE

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P0-001: Map `fullName` in Flutter `AuthUser` | Mobile | 15 min | ✅ Done |
| P0-002: Align Flutter router with backend roles | Mobile | 30 min | ✅ Done |
| P0-003: Fix realtime socket default port | Mobile | 10 min | ✅ Done |
| P0-004: Allow MODERATOR on admin eBooks route | Admin-web | 15 min | ✅ Done |

**Validation:** Flutter auth tests 11/11 PASS

---

## Phase 2 — P1 major defects ✅ COMPLETE

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| P1-001: Add `UpdateUserProfileDto` validation | API | 30 min | ✅ Done |
| P1-002: Fix policies service spec mock | API | 15 min | ✅ Done |
| P1-003: Subscription plan admin UI + API client | Admin-web | 2 hr | ✅ Done |
| P1-004: Users page mutation error handling | Admin-web | 30 min | ✅ Done |
| P1-005: Subscriptions mutation error handling | Admin-web | 30 min | ✅ Done |

**Validation:** API build PASS · 171/171 tests PASS

---

## Phase 3 — P2 minor defects (recommended next sprint)

### Sprint A — Mobile UX (3–5 days)

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| P2-001 | Add Flutter profile service + edit screen (`PATCH /users/:id/profile`) | 1 day | None |
| P2-005 | Shared HTTP client with 401 refresh retry | 1 day | Auth provider |
| P2-010 | Wire subscription content validate for gated clips/ebooks | 1 day | Subscriptions service |

### Sprint B — Admin polish (2–3 days)

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| P2-002 | Fix 403 → logout behavior in `http-client.ts` | 4 hr | Auth provider |
| P2-004 | Remove or implement `content/page.tsx` | 4 hr | Product decision |
| P2-007 | Subscriber detail + history drawer | 1 day | Subscriptions API |
| P2-009 | Standardize Axios error parsing across admin pages | 1 day | None |

### Sprint C — Platform consistency (2 days)

| ID | Task | Effort | Dependencies |
|----|------|--------|--------------|
| P2-003 | Document or standardize ADMIN vs MODERATOR role matrix | 1 day | Product/stakeholder |
| P2-006 | Clips favorites — backend sync or remove UI | 1 day | Product decision |
| P2-008 | Clips media upload endpoint (mirror announcements) | 1 day | Storage infra |

---

## Phase 4 — P3 enhancements (backlog)

| ID | Task | Trigger |
|----|------|---------|
| P3-001 | Consolidate library endpoints | API versioning cleanup |
| P3-002 | Remove duplicate subscription status route | Breaking change window |
| P3-003 | Clip view-count analytics | Analytics requirements |
| P3-004–006 | Unused mobile endpoints | UI enhancement requests |
| P3-007 | Fine-grained permissions | Multi-tenant or complex RBAC need |
| P3-008 | Email verification | Compliance requirement |

---

## Test plan (ongoing)

### Automated (run on every release)

```bash
# API
cd services/api && npm run build && npm test

# Flutter (auth + module tests)
cd apps/mobile-flutter && flutter test

# Admin-web (when test suite exists)
cd apps/admin-web && npm test
```

### Manual smoke (staging)

| Module | Test |
|--------|------|
| Auth | Login/logout/refresh on admin + mobile |
| Users | Admin list, role change, disable user |
| Announcements | Create, publish, view on mobile |
| Events | Create, RSVP on mobile |
| Clips | Create, view on mobile |
| Library | Purchase ebook, read in library |
| Subscriptions | Create plan, subscribe via Flutterwave sandbox |
| Notifications | Broadcast, receive on mobile (REST + realtime) |
| Programs | Enroll, update progress |
| Mentorship | Enroll, submit feedback |
| RBAC | MODERATOR accesses eBooks, events, clips |

---

## Release recommendation

**Beta-ready** for core ministry flows after P0/P1 fixes.

**Blockers removed:**
- Mobile users see correct names
- All backend roles can access mobile app
- Realtime notifications connect to correct port
- Moderators can manage eBooks in admin
- Profile updates validated on API
- Admin can manage subscription plans
- Full test suite green (171/171)

**Remaining before production:**
- Complete P2 mobile profile + shared auth refresh
- Flutterwave/SMTP/Firebase live credential validation (see separate readiness reports)
- P2 admin error-handling polish
- Staging end-to-end smoke test

---

## Sign-off checklist

- [x] P0 defects fixed and validated
- [x] P1 defects fixed and validated
- [x] `MODULE_AUDIT_REPORT.md` generated
- [x] `DEFECT_MATRIX.md` generated
- [x] API test suite 171/171 PASS
- [ ] P2 sprint scheduled
- [ ] Staging smoke test executed
- [ ] Production credential readiness (Flutterwave, SMTP, Firebase)
