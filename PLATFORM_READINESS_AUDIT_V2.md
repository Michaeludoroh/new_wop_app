# Platform Readiness Audit V2

**Date:** June 11, 2026  
**Scope:** Read-only audit across backend, admin web, Flutter mobile, database, RBAC, contracts, navigation, UX states, security, tests, and placeholders.  
**Constraint:** No source files were modified during this audit.

---

## Executive Summary

The ministry platform has **mature content modules** (announcements, events, programs, mentorship, policies, clips) with working backend services, mostly complete admin CRUD, and functional mobile list/detail flows. **Revenue and governance paths** are partially ready: subscriptions and Flutterwave payments work in code, but Paystack/Stripe are stubs, email delivery is mocked, and premium eBook URLs are exposed in list/detail API responses. **Admin operations** still have placeholder pages (Users, Content hub) and read-only payment views. **Mobile UX** relies heavily on dashboard launcher tabs rather than embedded experiences, with navigation gaps (eBook catalog, dead policy alias routes).

| Score | Value | Interpretation |
|-------|-------|----------------|
| **Launch readiness** | **68%** | Beta / controlled launch possible with Flutterwave + manual admin ops; not safe for broad public launch |
| **Production readiness** | **58%** | Security, payments, email, and entitlement gaps block hardened production |
| **Mobile readiness** | **72%** | Core flows exist; navigation, tests, and polish incomplete |
| **Admin readiness** | **76%** | Strong content + analytics; user mgmt and monetization admin incomplete |

---

## Audit Dimensions (Platform-Wide)

| # | Dimension | Status | Notes |
|---|-----------|--------|-------|
| 1 | Backend routes | **Mostly complete** | 13 domain modules wired; stubs in Paystack/Stripe; duplicate `GET /subscriptions/me` + `/status` |
| 2 | Database models | **Complete** | Prisma schema aligned with modules; 14 migrations; Policy/Acceptance added |
| 3 | Prisma migrations | **Complete** | Idempotent reconcile pattern; module expansions through `20260611180000` |
| 4 | RBAC permissions | **Mostly complete** | Hierarchy guard works; route-security spec covers key controllers; announcements ADMIN-only vs MODERATOR elsewhere |
| 5 | Mobile screens | **Partial** | 17 screens + router; 7/8 dashboard tabs are launchers |
| 6 | Admin screens | **Partial** | 8 full CRUD, 5 partial, 2 placeholders |
| 7 | API contracts | **Thin** | `api-contract.spec.ts` covers 4 DTO cases only; no OpenAPI; mobile/admin rely on ad-hoc normalization |
| 8 | Navigation flows | **Gaps** | Mobile: `/ebooks` unreachable from Library; dead policy alias routes; admin nav all resolve |
| 9 | Error handling | **Inconsistent** | List screens: error card + retry (varies); some detail screens lack Retry |
| 10 | Empty states | **Good** | Most list screens have filter-aware empty copy |
| 11 | Loading states | **Good** | Spinner pattern consistent; no skeletons |
| 12 | Security concerns | **High risk items** | eBook `fileUrl` leak, static uploads, mock email, payment provider gaps |
| 13 | Broken links | **Low** | Admin nav: none broken; mobile: logical dead ends not href 404s |
| 14 | Placeholder content | **Present** | Users/Content admin pages, auth landing copy, status page fallback data |
| 15 | Dead code | **Present** | `home_screen.dart`, policy alias routes, dashboard default→eBooks branch |
| 16 | Test coverage gaps | **Significant** | Backend: 117 unit tests, no e2e/controllers; Admin: 1 vitest file; Mobile: 17 test files, mostly empty-state |

---

## Module-by-Module Audit

### Authentication

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Register, login, logout, refresh, forgot/reset, `/auth/me`; throttling | **~88%** |
| Database | `User`, `RefreshToken`, RBAC `Role` enum | **~95%** |
| RBAC | JWT per-route; no global guard | **~90%** |
| Admin | Login only; no forgot-password UI | **~65%** |
| Mobile | Full auth stack + bootstrap + tests | **~85%** |
| Tests | 5 backend (strategy + rate-limit); 8 mobile auth tests | **~60%** |

**Gaps:** No email verification, no OAuth, no `auth.service.spec.ts`, no change-password (authenticated), admin cannot reset user passwords.

---

### Notifications

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | List, read-state, broadcast, targeted; push + realtime adjunct | **~85%** |
| Database | `Notification`, `PushDeviceToken`, `PushDeliveryLog` | **~90%** |
| RBAC | USER read/mark; ADMIN create | **~90%** |
| Admin | Feed + create + mark read; no delete | **~78%** |
| Mobile | Screen + provider + FCM + badge; no tests | **~72%** |
| Tests | 2 service tests + 8 push tests | **~55%** |

**Gaps:** EMAIL channel uses `MockSmtpProvider` (logs only). No notification preferences. No mobile widget tests. Announcement deeplink to detail not wired.

---

### Announcements

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Public/admin split, CRUD, publish, upload, categories, soft delete | **~94%** |
| Database | Full model + category enum + notification relations | **~95%** |
| RBAC | Public read; ADMIN/SUPER_ADMIN mutations (not MODERATOR) | **~95%** |
| Admin | Full page + hooks + image upload | **~88%** |
| Mobile | Dedicated tab (embedded) + detail + share; empty-state test | **~88%** |
| Tests | 12 backend (service + validation) | **~82%** |

**Gaps:** No admin vitest. Mobile standalone route unused. No deeplink from push notification.

---

### Clips

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Public catalog + MODERATOR admin CRUD + featured | **~90%** |
| Database | Expanded clip fields (tags, speaker, viewCount) | **~92%** |
| RBAC | Public read; MODERATOR+ admin | **~90%** |
| Admin | Full CRUD page (no hooks layer) | **~85%** |
| Mobile | List + video details; dashboard launcher tab | **~75%** |
| Tests | 5 service tests; no mobile tests | **~65%** |

**Gaps:** No premium gating despite `ContentAccessService` supporting `clip`. Public `mediaUrl` fully exposed. Details error screen lacks Retry.

---

### Events

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Public + RSVP + admin + attendees | **~90%** |
| Database | `Event`, `EventAttendee`, location enums | **~95%** |
| RBAC | Public read; USER RSVP; MODERATOR admin | **~90%** |
| Admin | Full CRUD + attendee list | **~85%** |
| Mobile | List + RSVP details; launcher tab | **~78%** |
| Tests | 9 service; 1 mobile empty-state | **~70%** |

**Gaps:** `meetingLink` on public detail for online events. No waitlist UX when at capacity.

---

### eBooks (+ Library)

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Admin CRUD, uploads, library, progress, purchase, `/access` tokens | **~82%** |
| Database | `Ebook`, `EbookPurchase`, `ReadingProgress` | **~95%** |
| RBAC | All routes JWT-required; no public catalog | **~85%** |
| Admin | Full CRUD + uploads + analytics section | **~88%** |
| Mobile | Catalog, library, details, PDF reader; **catalog nav gap** | **~72%** |
| Tests | 8 service; 2 mobile empty-state | **~68%** |

**Gaps (critical):** `toResponse()` returns `fileUrl`/`pdfPath` for all ebooks including premium — bypasses `/access` gating. Static `/api/v1/uploads` serves files directly. Mobile Library tab does not link to `/ebooks` catalog.

---

### Premium Content (cross-cutting)

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | `ContentAccessService` HMAC tokens; subscription grace; ebook `/access` | **~80%** |
| Database | `isPremium`, `UserSubscription`, `SubscriptionStatusHistory` | **~92%** |
| RBAC | `/subscriptions/content/validate` for USER+ | **~85%** |
| Admin | Subscriptions page (partial); per-module analytics | **~70%** |
| Mobile | Subscription screen + membership card + checkout | **~78%** |
| Tests | content-access (2) + subscriptions (3) + lifecycle (2) | **~70%** |

**Gaps:** Premium not enforced on clips/programs/mentorship. `secureFileKey` unused. Dual purchase paths (`POST /ebooks/purchase` vs checkout).

---

### Programs

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Public + enroll + progress + admin analytics | **~88%** |
| Database | `EmpowermentProgram`, enrollment, progress | **~95%** |
| RBAC | Public read; USER enroll; MODERATOR admin | **~90%** |
| Admin | Full CRUD + enrollments/progress read | **~85%** |
| Mobile | List + details; launcher tab | **~78%** |
| Tests | 7 service; 1 mobile empty-state | **~70%** |

**Gaps:** No payment prerequisite for paid programs. Admin enrollment lists expose PII.

---

### Mentorship

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Classes, sessions, attendance, feedback, progress | **~88%** |
| Database | 6 related models + waitlist fields | **~95%** |
| RBAC | Public read; USER enroll/feedback; MODERATOR admin | **~90%** |
| Admin | Class CRUD; sessions create-only in UI (API has update/delete/attendance) | **~75%** |
| Mobile | List + rich details; launcher tab | **~78%** |
| Tests | 7 service; 1 mobile empty-state | **~70%** |

**Gaps:** Session edit/delete/attendance marking not in admin UI. Public session `meetingLink` exposure.

---

### Policies & Governance

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Versioned policies, acceptance, analytics, public/admin split | **~94%** |
| Database | `Policy`, `PolicyAcceptance`, `PolicyType` enum | **~95%** |
| RBAC | Public read; USER accept; MODERATOR admin | **~92%** |
| Admin | Full page + rich text + history + analytics | **~90%** |
| Mobile | Profile hub + acceptance modal + policy view | **~80%** |
| Tests | 8 service; 1 profile widget test | **~72%** |

**Gaps:** No seeded policy content (acceptance prompt only fires when published policies exist). Mobile strips HTML. Four alias routes registered but unused. No hard navigation gate after declining acceptance.

---

### Payments

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Flutterwave checkout + webhook; Paystack/Stripe throw `NotImplementedException` | **~62%** |
| Database | `PaymentTransaction`, `PaymentWebhookEvent` | **~92%** |
| RBAC | USER checkout/status; ADMIN webhook events; public webhook (signature verified) | **~85%** |
| Admin | Read-only transactions + webhook events | **~60%** |
| Mobile | Embedded in subscription + ebook purchase (external browser) | **~65%** |
| Tests | 6 service tests | **~65%** |

**Gaps:** Production depends on Flutterwave config + webhook secret. No refund/dispute admin. No mobile payment-specific tests.

---

### Subscriptions

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Plans, subscribe, cancel, admin lifecycle, grace, analytics | **~85%** |
| Database | Plans, user subscriptions, status history | **~95%** |
| RBAC | USER self-service; ADMIN plan CRUD + lifecycle | **~88%** |
| Admin | Subscriber table + status/cancel + lifecycle trigger | **~72%** |
| Mobile | Plans, checkout, grace UX, cancel | **~78%** |
| Tests | 7 across service + lifecycle + content-access | **~72%** |

**Gaps:** No public plans endpoint (login required). Duplicate `/me` and `/status`. Lifecycle is manual admin POST, not cron. No plan CRUD in admin UI.

---

### Admin Dashboard (Analytics)

| Layer | Status | Completion |
|-------|--------|------------|
| Backend | Summary, dashboard, growth, activity, top-content, operational, report | **~84%** |
| Database | Aggregates across all domain tables | **~90%** |
| RBAC | SUPER_ADMIN + ADMIN only | **~95%** |
| Admin | Home KPIs + `/analytics` page + normalize layer + 5 vitest tests | **~84%** |
| Mobile | N/A | — |
| Tests | 6 backend + 5 admin normalize | **~75%** |

**Gaps:** No export (CSV/PDF). Realtime count depends on socket infra. Per-module analytics duplicated across modules.

---

## Critical Blockers

These must be resolved before a **public production launch**.

| # | Issue | Module | Evidence |
|---|-------|--------|----------|
| C1 | **Premium eBook URLs exposed in API list/detail responses** — `fileUrl` and `pdfPath` returned for all titles, undermining `/access` token gating | eBooks / Premium | `services/api/src/modules/ebooks/ebooks.service.ts` (`toResponse` ~L1415) |
| C2 | **Static file serving without signed URLs** — `/api/v1/uploads` serves uploaded PDFs/images directly if URL is known | Security | `services/api/src/main.ts` L102 |
| C3 | **Email notifications not delivered in production** — `MockSmtpProvider` logs only | Notifications | `services/api/src/modules/email/mock-smtp.provider.ts` |
| C4 | **Paystack and Stripe payment adapters not implemented** — only Flutterwave registered | Payments | `paystack.provider.ts`, `stripe.provider.ts` |
| C5 | **No admin user management UI** — cannot disable users, assign roles, or handle abuse at launch | Users / Admin | `apps/admin-web/app/(protected)/users/page.tsx` (ModulePage placeholder) |
| C6 | **Policy content not seeded** — governance acceptance workflow requires admin to publish all four policy types before launch compliance | Policies | No seed migration or bootstrap script |

---

## High-Priority Issues

| # | Issue | Module | Impact |
|---|-------|--------|--------|
| H1 | Mobile eBook catalog (`/ebooks`) unreachable from Library tab or empty states | Mobile / eBooks | Users cannot browse/purchase titles from primary nav |
| H2 | Dashboard uses launcher tabs for 7/8 modules — poor mobile UX at scale | Mobile | Extra taps; inconsistent with Announcements embedded tab |
| H3 | No end-to-end or controller integration tests | Backend | Regressions in route wiring undetected |
| H4 | API contract coverage limited to 4 DTO tests | Contracts | Admin/mobile breakage on field renames undetected |
| H5 | Premium subscription not enforced on clips (all `mediaUrl` public) | Premium / Clips | Revenue leakage for video premium strategy |
| H6 | Subscription lifecycle processing is manual (admin POST), not scheduled | Subscriptions | Grace/expiry may drift in production |
| H7 | Admin Content hub is placeholder — no unified moderation view | Admin | Operational overhead across 4 separate pages |
| H8 | FCM push requires Firebase credentials — fails silently if unset | Notifications / Mobile | Push delivery may not work in new environments |
| H9 | Dependency vulnerabilities noted in prior security audit (`docs/security-audit.md`) | Platform | Conditional go from Phase 4A audit |
| H10 | No real SMTP / SendGrid / SES provider wired | Notifications | Password reset emails may also be affected if using same provider |

---

## Medium-Priority Issues

| # | Issue | Module |
|---|-------|--------|
| M1 | Announcements admin restricted to ADMIN/SUPER_ADMIN while other content uses MODERATOR — inconsistent ops model |
| M2 | Mentorship admin UI missing session update/delete and attendance marking (API exists) |
| M3 | Admin subscriptions: no plan create/edit UI (API supports POST/PATCH/DELETE plans) |
| M4 | Admin payments read-only — no retry/refund tooling |
| M5 | Duplicate subscription endpoints `GET /subscriptions/me` and `GET /subscriptions/status` |
| M6 | Dual eBook purchase paths (`POST /ebooks/purchase` vs payment checkout) |
| M7 | Mobile policy alias routes dead code (`/policies/terms-of-use` etc.) |
| M8 | `home_screen.dart` unused in production router |
| M9 | Auth landing screen still says features “being rolled out” |
| M10 | No notification delete or bulk mark-read in admin |
| M11 | Mobile clips/event details missing Retry on fatal load errors |
| M12 | Admin web: only announcements/policies/notifications/payments/analytics use hooks; others inline state |
| M13 | No OpenAPI/Swagger spec for client generation |
| M14 | `/status` admin page exists but not in nav (orphan route) |
| M15 | Policy acceptance modal non-blocking for navigation if API fails open |

---

## Low-Priority Issues

| # | Issue | Module |
|---|-------|--------|
| L1 | No skeleton loaders — spinner-only UX |
| L2 | Mobile HTML policy content stripped to plain text |
| L3 | Admin rich text uses `document.execCommand` (deprecated API) |
| L4 | 14 pre-existing Flutter analyze info lints in non-policy screens |
| L5 | Announcements standalone route registered but never push-navigated |
| L6 | No CSV/PDF export on analytics or policy acceptance |
| L7 | No certificate/completion endpoint for programs |
| L8 | No user notification preferences |
| L9 | OAuth / social login not implemented |
| L10 | Shared-types package not used for cross-client DTOs |
| L11 | Widget tests cover empty states only — no error/loading paths |
| L12 | Admin vitest scope excludes all pages and hooks except analytics normalize |

---

## RBAC Summary

| Pattern | Modules | Notes |
|---------|---------|-------|
| Public read + JWT admin | Clips, Events, Programs, Mentorship, Policies, Announcements | Consistent split |
| JWT-only (no public) | eBooks, Subscriptions, Notifications (all routes) | Catalog requires login |
| ADMIN-only admin | Announcements, Analytics | Stricter than MODERATOR content modules |
| MODERATOR+ admin | Clips, Events, Programs, Mentorship, Policies, eBooks | Hierarchy allows ADMIN/SUPER_ADMIN |
| USER self-service | RSVP, enroll, progress, policy accept, payments checkout | Covered in route-security spec |

**Validated by:** `services/api/src/security/route-security.spec.ts` (4 describe blocks, metadata-only).

---

## Database & Migrations

| Migration | Domain |
|-----------|--------|
| `20260521211453_auth_schema_sync` | Auth, base content tables including Policy stub |
| `20260521220158_add_rbac_roles` | RBAC |
| `20260523001204_sync_auth_schema` | RefreshToken, Role enum |
| `20260608152857_prisma_wop` | Platform baseline |
| `20260608153000_ebooks_library_manual_safe` | eBooks library |
| `20260610191000_reconcile_platform_schema` | Notifications, payments, reconcile |
| `20260610202500_add_ebook_purchase_transaction_type` | eBook purchases |
| `20260610230500_expand_clips_module` | Clips |
| `20260610235500_add_events_module` | Events |
| `20260611120000_premium_subscription_hardening` | Subscriptions grace/history |
| `20260611140000_expand_programs_module` | Programs |
| `20260611160000_expand_mentorship_module` | Mentorship |
| `20260611180000_expand_policies_module` | Policies governance |

**Status:** Schema and migration history are **production-viable** assuming migrations are applied in order on target DB.

---

## Test Coverage Summary

| Surface | Files | Approx. tests | Gap |
|---------|-------|---------------|-----|
| Backend unit | 24 spec files | **117** | No controller/e2e; thin auth |
| Backend contracts | 1 file | **4** | DTO validation only |
| Admin vitest | 1 file | **5** | Analytics normalize only |
| Mobile widget/unit | 17 files | **~25+** | Mostly auth + empty states |

**Modules with zero mobile tests:** Clips, Notifications, Policy detail, PDF reader, payment checkout flows.

---

## Readiness Scores by Module

| Module | Backend | Admin | Mobile | Overall |
|--------|---------|-------|--------|---------|
| Authentication | 88% | 65% | 85% | **79%** |
| Notifications | 85% | 78% | 72% | **78%** |
| Announcements | 94% | 88% | 88% | **90%** |
| Clips | 90% | 85% | 75% | **83%** |
| Events | 90% | 85% | 78% | **84%** |
| eBooks | 82% | 88% | 72% | **81%** |
| Premium Content | 80% | 70% | 78% | **76%** |
| Programs | 88% | 85% | 78% | **84%** |
| Mentorship | 88% | 75% | 78% | **80%** |
| Policies | 94% | 90% | 80% | **88%** |
| Payments | 62% | 60% | 65% | **62%** |
| Subscriptions | 85% | 72% | 78% | **78%** |
| Admin Dashboard | 84% | 84% | — | **84%** |

**Weighted platform module average:** **~80%**

---

## Composite Readiness Scores

### Launch Readiness — **68%**

Suitable for **controlled beta** with manual ops if:
- Flutterwave is configured and webhooks verified
- Admin publishes policies and core content manually
- Team accepts mock email (or wires SMTP before invite-only launch)
- Premium eBook leak mitigated via network ACL on `/uploads` or urgent code fix

### Production Readiness — **58%**

Blocked by C1–C4, dependency remediation, real email, payment hardening, and user admin tooling.

### Mobile Readiness — **72%**

Functional module screens exist; navigation architecture and test depth limit confidence.

### Admin Readiness — **76%**

Strong for content editors and analytics viewers; weak for user support, payments ops, and plan management.

---

## Recommended Action Plan

### Phase 0 — Blockers (before any public launch)

1. **Remove `fileUrl`/`pdfPath` from eBook list/detail responses** for premium titles; serve only via `/access` signed flow.
2. **Protect `/uploads`** with auth middleware or move premium files to private storage + signed URLs.
3. **Wire production email provider** (SMTP/SES/SendGrid) replacing `MockSmtpProvider`.
4. **Confirm Flutterwave** keys, webhook URL, and signature verification in staging.
5. **Publish all four policy types** in admin and verify mobile acceptance flow end-to-end.
6. **Implement admin Users page** (list, role, disable) matching `UsersController` API.

### Phase 1 — High priority (launch week)

1. Add **Browse eBooks** navigation from Library tab → `/ebooks`.
2. Embed or simplify **dashboard tabs** (match Announcements pattern for Events/Programs).
3. Add **controller integration tests** for auth, payments webhook, ebooks access.
4. Schedule **subscription lifecycle** job (cron/worker) for grace/expiry.
5. Run **`npm audit` remediation** per `docs/security-audit.md`.
6. Configure **Firebase/FCM** for push in mobile build pipeline.

### Phase 2 — Medium priority (post-launch)

1. Complete **mentorship session admin** UI (edit/delete/attendance).
2. Add **subscription plan CRUD** to admin.
3. Expand **api-contract.spec.ts** for ebooks, policies, payments DTOs.
4. Remove dead routes/code (`home_screen`, policy aliases, dashboard default branch).
5. Implement **Content hub** or remove nav item.
6. Add **notification deeplinks** to announcement detail on mobile.

### Phase 3 — Polish

1. Skeleton loaders and consistent Retry on all detail screens.
2. Mobile HTML rendering for policies (flutter_widget_from_html or similar).
3. OpenAPI spec generation.
4. Expand widget tests to error/loading paths.
5. Paystack/Stripe adapters if multi-region payments required.

---

## Validation Performed (Read-Only)

| Check | Method |
|-------|--------|
| Backend routes & RBAC | Controller grep + `route-security.spec.ts` + explore agent |
| Prisma models/migrations | `schema.prisma` + 14 migration folders |
| Admin pages | Page inventory + `nav-links.ts` + ModulePage usage |
| Mobile screens/routes | `app_router.dart` + `dashboard_screen.dart` + test glob |
| API contracts | `api-contract.spec.ts` review |
| Security | `ebooks.service.ts`, `main.ts`, `mock-smtp.provider.ts`, payment providers |
| Placeholders/dead code | Grep ModulePage, TODO, unused routes |
| Test inventory | Glob `*.spec.ts`, `*_test.dart`, `*.test.ts` |

**Not executed in this audit:** Live `npm test`, `flutter analyze`, migration apply against production DB, penetration test, or load test.

---

## Related Documents

| Document | Relevance |
|----------|-----------|
| `ANNOUNCEMENTS_COMPLETION_REPORT.md` | Announcements now ~91% (post-audit V1 baseline was 68%) |
| `ADMIN_DASHBOARD_COMPLETION_REPORT.md` | Dashboard now ~84% |
| `POLICIES_IMPLEMENTATION_REPORT.md` | Policies ~92% |
| `PREMIUM_CONTENT_COMPLETION_REPORT.md` | Subscription hardening scope |
| `docs/security-audit.md` | Phase 4A security baseline (score 71/100) |

---

*End of Platform Readiness Audit V2*
