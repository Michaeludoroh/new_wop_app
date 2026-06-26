# Firebase Credentials Security Report

**Date:** 2026-06-18  
**Goal:** Prevent accidental commit of Firebase Admin service account JSON files.

---

## Executive summary

| Check | Before | After |
|-------|--------|-------|
| `.gitignore` patterns for Admin keys | **Missing** | **Added** (root + `services/api/`) |
| Local Admin JSON tracked by git | **No** (untracked) | **No** |
| Local Admin JSON ignored by git | **No** | **Yes** |
| Admin key ever in git history | **No** | **No** |

**Verdict: PASS** — credentials are not tracked and are now explicitly ignored.

---

## Gitignore audit

Twelve `.gitignore` files exist in the repository:

| Path | Firebase Admin patterns (before) | Firebase Admin patterns (after) |
|------|----------------------------------|----------------------------------|
| `.gitignore` (root) | None | `*firebase-adminsdk*.json`, `service-account*.json` |
| `services/api/.gitignore` | **Did not exist** | **Created** — same two patterns |
| `apps/mobile-flutter/.gitignore` | None | None (mobile client configs use separate `.example` templates) |
| `apps/mobile-flutter/android/.gitignore` | None | None |
| `apps/mobile-flutter/ios/.gitignore` | None | None |
| `apps/mobile-flutter/linux/.gitignore` | None | None |
| `apps/mobile-flutter/macos/.gitignore` | None | None |
| `apps/mobile-flutter/windows/.gitignore` | None | None |
| `android/.gitignore` | None | None |
| `ios/.gitignore` | None | None |
| `linux/.gitignore` | None | None |
| `macos/.gitignore` | None | None |
| `windows/.gitignore` | None | None |

### Existing secret-related rules (unchanged)

Root `.gitignore` already ignores environment files:

```gitignore
.env
.env.*
!.env.example
!.env.staging.example
!.env.production.example
!**/.env.example
```

This protects inline `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env` but **did not** cover downloaded JSON key files.

---

## Patterns added

### Root `.gitignore`

```gitignore
# Firebase Admin / GCP service account keys (never commit)
*firebase-adminsdk*.json
service-account*.json
```

### New `services/api/.gitignore`

```gitignore
# Firebase Admin service account keys (local dev only)
*firebase-adminsdk*.json
service-account*.json
```

These patterns match anywhere in the repo tree (not path-anchored), covering keys placed under `services/api/`, repo root, or other directories.

---

## Target file verification

| Property | Value |
|----------|-------|
| **File** | `services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json` |
| **Tracked by git (`git ls-files`)** | **No** |
| **In git history** | **No** (no commits contain this path) |
| **Ignored (`git check-ignore -v`)** | **Yes** — rule: `services/api/.gitignore:2:*firebase-adminsdk*.json` |
| **Status (`git status --ignored`)** | `!!` (ignored) |

Prior to this change the file appeared as **untracked** (`??`) in `git status`, meaning it could have been accidentally staged with `git add .`. It is now excluded from default status output and cannot be added without `git add -f`.

---

## What is still tracked (intentionally)

These are **client** Firebase configs, not Admin private keys:

| File | Type |
|------|------|
| `apps/mobile-flutter/android/app/google-services.json` | Android client config |
| `apps/mobile-flutter/firebase.json` | FlutterFire project metadata |

Mobile templates remain as `.example` files for onboarding. Admin keys must never be committed.

---

## Recommendations

1. **Never** `git add -f` on service account JSON files.
2. Keep `FIREBASE_SERVICE_ACCOUNT_FILE` in local `services/api/.env` only (`.env` is already gitignored).
3. Use CI/staging secrets (`FIREBASE_SERVICE_ACCOUNT_JSON` env var) rather than files in deployed environments.
4. If a key was ever committed historically, rotate it in Firebase Console and purge from git history — **not required here** (file was never committed).

---

## Files changed in this hardening

| File | Action |
|------|--------|
| `.gitignore` | Added Firebase Admin ignore patterns |
| `services/api/.gitignore` | **Created** with Firebase Admin ignore patterns |
| `FIREBASE_CREDENTIALS_SECURITY_REPORT.md` | This report |

---

## Verification commands

```bash
# Confirm not tracked
git ls-files services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
# (no output)

# Confirm ignored
git check-ignore -v services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
# services/api/.gitignore:2:*firebase-adminsdk*.json  services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json

# Confirm ignored status
git status --ignored -- services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
# !! services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
```
