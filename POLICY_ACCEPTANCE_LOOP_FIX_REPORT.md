# Policy Acceptance Loop Fix Report

**Date:** 2026-06-17  
**Issue:** After accepting Terms & Conditions, the policy modal reappears 3–4 times before the dashboard stabilizes.

---

## Root cause

The loop was **not** caused by failed backend persistence. Acceptance via `POST /policies/me/accept` correctly upserts `PolicyAcceptance` records. The seed defines **four** required policy types (`TERMS_OF_USE`, `PRIVACY_POLICY`, `COMMUNITY_GUIDELINES`, `CONTENT_SHARING_RULES`), so new users legitimately need four acceptances — but the UX made this feel like a bug.

The actual defects were on the Flutter client:

### 1. Dashboard remounting re-triggered the prompt (primary)

`MinistryMobileApp` rebuilds `DashboardScreen` on every `AuthProvider.notifyListeners()` call. During login/register:

1. `AuthStatus.loading` → splash
2. `AuthStatus.authenticated` → **new** `DashboardScreen` → `initState` → policy prompt
3. `isBusy: false` notify → **another new** `DashboardScreen` → **second** prompt

Push token registration and other auth updates could trigger additional rebuilds, stacking modals.

### 2. No session-level deduplication

`maybePromptPolicyAcceptance()` had no guard against concurrent or repeated invocations. Each dashboard mount independently fetched status and opened a dialog.

### 3. Stale in-dialog state after acceptance

The dialog advanced a local index through the initial `pendingPolicies` snapshot but **did not re-fetch** `/policies/me/status` after each accept. Combined with remounts, the same first policy could appear again in a fresh dialog.

### 4. Multiple pending policies (expected, poorly surfaced)

Backend returns all pending policies in one response. The dialog supported sequential flow but did not clearly label progress by policy type, so accepting "Terms" then seeing another modal felt like the same prompt repeating.

---

## Audit findings

| Question | Finding |
|----------|---------|
| Is acceptance persisted? | **Yes** — `PolicyAcceptance.upsert` with `userId_policyId` unique key; `acceptedAt` defaults on create |
| Multiple policies one-at-a-time? | **Partially** — dialog iterated locally but did not refresh from server; remounts broke the sequence |
| Stale cached state? | **Yes** — fixed pending list in dialog state; no post-accept status refresh |
| Race between accept and status? | **Yes** — dashboard could prompt again before gate knew all policies were accepted |
| Why multiple accepts before dashboard? | **4 required policies** + **2–4 dashboard remounts** each opening a new modal |

### Backend (no changes required)

- `GET /policies/me/status` — returns `{ pending, accepted, requiresAction }` for all active policy types
- `POST /policies/me/accept` — upserts acceptance with current policy version
- `PolicyAcceptance` model — `@@unique([userId, policyId])`, version tracked per acceptance

---

## Fix implemented

### 1. `PolicyAcceptanceGate` (new)

`apps/mobile-flutter/lib/core/policies/policy_acceptance_gate.dart`

- Single in-flight prompt (`_ongoingPrompt`) — concurrent callers await the same future
- Per-user session satisfaction flag — skips re-prompt after all policies accepted
- Loop: fetch status → show dialog → on success, re-fetch status until `requiresAction == false`
- `resetSession()` on logout

### 2. Dialog refresh after each accept

`apps/mobile-flutter/lib/widgets/policy_acceptance_dialog.dart`

- After `acceptPolicy()`, calls `getAcceptanceStatus()` again
- Replaces `_pendingPolicies` with server truth (not stale snapshot)
- Clear progress: **"Policy 2 of 4"**, button **"Accept & Next Policy"**

### 3. Stable dashboard instance

`apps/mobile-flutter/lib/app.dart`

- Converted to `StatefulWidget` with `GlobalKey` on `DashboardScreen`
- Auth rebuilds no longer dispose/recreate dashboard state → `initState` runs once per session

### 4. Logout resets gate

`apps/mobile-flutter/lib/core/auth/auth_provider.dart`

- `PolicyAcceptanceGate.resetSession()` on logout so next login re-prompts correctly

### 5. Robust status JSON parsing

`apps/mobile-flutter/lib/core/policies/models/policy_models.dart`

- `PolicyAcceptanceStatus.fromJson` unwraps optional `data` envelope

---

## Files changed

| File | Change |
|------|--------|
| `apps/mobile-flutter/lib/core/policies/policy_acceptance_gate.dart` | **New** — session gate + deduplicated prompt loop |
| `apps/mobile-flutter/lib/widgets/policy_acceptance_dialog.dart` | Post-accept status refresh, progress UI |
| `apps/mobile-flutter/lib/app.dart` | `GlobalKey` preserves dashboard across auth rebuilds |
| `apps/mobile-flutter/lib/screens/dashboard_screen.dart` | Pass `userId` to gate |
| `apps/mobile-flutter/lib/core/auth/auth_provider.dart` | Reset gate on logout |
| `apps/mobile-flutter/lib/core/policies/models/policy_models.dart` | Optional `data` wrapper parsing |
| `apps/mobile-flutter/test/policy_acceptance_test.dart` | **New** — model + gate unit tests |

**Backend:** unchanged (persistence verified correct).

---

## Validation results

### Automated tests

| Suite | Result |
|-------|--------|
| `flutter test test/policy_acceptance_test.dart` | **4/4 PASS** |
| `flutter test` (full suite) | **59/59 PASS** |
| `policies.service.spec.ts` | **9/9 PASS** |
| `flutter analyze` (changed files) | **0 issues** |

### Scenario matrix (logic verified)

| Scenario | Expected behavior after fix |
|----------|----------------------------|
| **New user registration** | Single modal session; sequential accept for up to 4 policies; dashboard visible immediately when `requiresAction == false` |
| **Existing user, no acceptances** | Same as new user; one gate invocation despite auth rebuilds |
| **Existing user, partial acceptances** | Status refresh shows only remaining pending policies |
| **Existing user, all accepted** | Gate marks satisfied; no modal; dashboard loads immediately |
| **Logout → login** | Gate reset; prompt shown again if policies still pending |

---

## Expected user experience after fix

1. User lands on dashboard (may briefly show behind modal).
2. **One** modal session opens.
3. User accepts policies sequentially: **Policy 1 of 4 → 2 of 4 → … → 4 of 4**.
4. Modal closes; dashboard is immediately usable.
5. No repeated modals from auth state churn.

---

## Follow-up (optional)

- Pre-login policy acceptance for registration flow (currently post-auth only)
- Backend batch accept endpoint to reduce round-trips for four policies
- Widget test with mocked `PolicyService` for full gate integration
