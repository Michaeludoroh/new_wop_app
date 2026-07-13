# Firebase Service Account File Location Report

**Date:** 2026-06-18  
**Scope:** Locate Firebase Admin service account JSON in workspace; validate structure; compare against `services/api/.env` configuration.

---

## Executive summary

One Firebase Admin service account JSON file was found in the workspace. It is valid, located under `services/api/`, and its filename matches the value documented in `services/api/.env.example`. **`services/api/.env` does not currently define `FIREBASE_SERVICE_ACCOUNT_FILE`**, so the API will not load this file until that variable is set.

---

## Search results

| Pattern | Matches | Notes |
|---------|---------|-------|
| `*firebase-adminsdk*.json` | **1** | Admin service account (see below) |
| `*service-account*.json` | **0** | — |
| `*.json` under `services/api/` | 45 total | Only 1 is a Firebase Admin key; others are test/temp/config files |
| Repo root `*.json` | No admin key files | — |
| `*firebase*.json` (whole repo) | 2 | Admin key + `apps/mobile-flutter/firebase.json` (Flutter project config, not credentials) |

---

## Primary match — Firebase Admin service account

| Field | Value |
|-------|-------|
| **Full file path** | `C:\new_wop_app\services\api\ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json` |
| **Relative path** | `services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json` |
| **Exact filename** | `ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json` |
| **File exists** | **Yes** |
| **File size** | 2,385 bytes |
| **Last modified** | 2026-06-18 22:12:55 (local) |

### Credential validation (structure only — private key not shown)

| Check | Result |
|-------|--------|
| Valid JSON | **Yes** |
| `type` | `service_account` |
| `project_id` | `ministry-mobile` |
| `client_email` | `firebase-adminsdk-fbsvc@ministry-mobile.iam.gserviceaccount.com` |
| `private_key` present | **Yes** (non-empty; contents not logged) |
| **Valid Firebase Admin credentials** | **Yes** |

---

## `.env` configuration comparison

### `services/api/.env` (active local env)

| Variable | Set? | Value |
|----------|------|-------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **No** | Not present in file |
| `FIREBASE_SERVICE_ACCOUNT_FILE` | **No** | Not present in file |
| `FCM_PROJECT_ID` | **No** | Not present in file |
| `FCM_CLIENT_EMAIL` | **No** | Not present in file |
| `FCM_PRIVATE_KEY` | **No** | Not present in file |

**Filename match vs `services/api/.env`:** **N/A** — `FIREBASE_SERVICE_ACCOUNT_FILE` is not configured.

### `services/api/.env.example` (template)

| Variable | Value |
|----------|-------|
| `FIREBASE_SERVICE_ACCOUNT_FILE` | `ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json` |

**Filename match vs `.env.example`:** **Yes** — exact match with the file on disk.

---

## Other Firebase-related JSON (not Admin credentials)

These files were found but are **not** Firebase Admin service account keys:

| Path | Purpose | Admin credentials? |
|------|---------|-------------------|
| `apps/mobile-flutter/android/app/google-services.json` | Android client config | **No** (has `project_id` only; no `client_email` / `private_key`) |
| `apps/mobile-flutter/android/google-services.json` | Android client config copy | **No** |
| `apps/mobile-flutter/firebase.json` | FlutterFire project metadata | **No** |
| `services/api/tmp-*.json`, `tmp-hardening/*.json`, etc. | Test / hardening artifacts | **No** |

---

## Recommended action

Add to `services/api/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_FILE=ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
```

Then restart the API and confirm startup log:

```text
[FcmProvider] Firebase Admin initialized via file
```

---

## Security note

The service account JSON contains a live private key. It currently exists in the workspace under `services/api/` and is **not** matched by any `.gitignore` rule for `*firebase-adminsdk*.json`. Consider adding that pattern to `.gitignore` and ensuring the file is never committed to version control.

---

## Verdict

| Question | Answer |
|----------|--------|
| Admin JSON file found? | **Yes** — one file under `services/api/` |
| File exists on disk? | **Yes** |
| Valid Admin credentials? | **Yes** |
| Matches `services/api/.env`? | **No** — variable not set in active `.env` |
| Matches `services/api/.env.example`? | **Yes** |
