# Firebase Admin Configuration Report

**Date:** 2026-06-18  
**Goal:** Load Firebase Admin credentials from a local service account JSON file while preserving existing env-based options.

---

## Summary

`FcmProvider` now resolves Firebase Admin credentials in this order:

1. `FIREBASE_SERVICE_ACCOUNT_JSON` — inline JSON (unchanged)
2. `FIREBASE_SERVICE_ACCOUNT_FILE` — path to downloaded service account JSON (**new**)
3. `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` — split credentials (unchanged)

On API startup, when credentials are configured, Nest logs exactly one of:

- `Firebase Admin initialized via JSON env`
- `Firebase Admin initialized via file`
- `Firebase Admin initialized via split credentials`

If no credentials are configured, startup continues with a warning; push delivery still fails at send time with `503`.

---

## Files changed

| File | Change |
|------|--------|
| `services/api/src/modules/push/push.providers/firebase-admin-credentials.loader.ts` | **New** — credential resolution, file loading, validation, error messages |
| `services/api/src/modules/push/push.providers/firebase-admin-credentials.loader.spec.ts` | **New** — 8 unit tests for resolution order, file load, validation errors |
| `services/api/src/modules/push/push.providers/fcm.provider.ts` | Uses loader; `OnModuleInit` eager init + startup log |
| `services/api/.env.example` | Added `FIREBASE_SERVICE_ACCOUNT_FILE` with local dev example |
| `.env.example` | Added `FIREBASE_SERVICE_ACCOUNT_FILE` |
| `.env.staging.example` | Added `FIREBASE_SERVICE_ACCOUNT_FILE` |
| `.env.production.example` | Added `FIREBASE_SERVICE_ACCOUNT_FILE` |
| `FCM_SETUP_REPORT.md` | Documented Option A2 (file path) and resolution order |
| `docs/pre-beta/EXTERNAL_SETUP.md` | Documented file-based local dev setup |
| `scripts/beta/validate-mobile-firebase.mjs` | Accepts `FIREBASE_SERVICE_ACCOUNT_FILE` |
| `scripts/beta/validate-pre-beta.mjs` | Accepts `FIREBASE_SERVICE_ACCOUNT_FILE` |

---

## Credential resolution behavior

### Priority

| Order | Variable | Behavior |
|-------|----------|----------|
| 1 | `FIREBASE_SERVICE_ACCOUNT_JSON` | `JSON.parse()` inline string; validates `projectId`, `clientEmail`, `privateKey` |
| 2 | `FIREBASE_SERVICE_ACCOUNT_FILE` | Reads UTF-8 file, parses JSON, same field validation |
| 3 | Split `FCM_*` | Uses `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` |

If option 1 is set (even empty-looking after trim check — only non-empty values count), options 2 and 3 are skipped.

### File path resolution

Relative paths are resolved in order:

1. `{process.cwd()}/{filePath}`
2. `{process.cwd()}/services/api/{filePath}` (monorepo root startup fallback)

Absolute paths are used as-is.

### Validation errors (examples)

| Condition | Error message |
|-----------|---------------|
| Invalid inline JSON | `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON` |
| File not found | `FIREBASE_SERVICE_ACCOUNT_FILE not found: … (checked: …)` |
| File unreadable | `FIREBASE_SERVICE_ACCOUNT_FILE could not be read: …` |
| Empty file | `FIREBASE_SERVICE_ACCOUNT_FILE is empty: …` |
| Invalid file JSON | `FIREBASE_SERVICE_ACCOUNT_FILE (…) is not valid JSON` |
| Missing fields | `Firebase Admin service account from … is missing required field(s): …` |
| No credentials at all | `Firebase Admin credentials are required: set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_FILE, or FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY` |

Private key `\n` escape sequences are normalized in all paths.

---

## Validation results

### Build

```text
cd services/api && npm run build
Exit code: 0
```

### Tests

| Command | Result |
|---------|--------|
| `npx jest src/modules/push/push.providers/firebase-admin-credentials.loader.spec.ts` | **8/8 PASS** |
| `npm test` (full suite) | **154/155 PASS** — 1 pre-existing failure in `policies.service.spec.ts` (unrelated to Firebase; mock missing `policyAcceptance.findMany` return) |

New Firebase credential tests cover:

- JSON env takes precedence over file and split creds
- File loading when JSON env unset
- Split credential fallback
- Invalid JSON env
- Missing file
- Incomplete split credentials
- Missing required JSON fields
- Relative path resolution

---

## Exact `.env` configuration required

### Local development (recommended — your downloaded file)

Place the downloaded key in `services/api/` (already present):

```text
services/api/ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json
```

In `services/api/.env`:

```env
# Leave inline JSON empty for local file-based loading
FIREBASE_SERVICE_ACCOUNT_JSON=

# Path relative to API cwd (services/api when running npm run start:dev)
FIREBASE_SERVICE_ACCOUNT_FILE=ministry-mobile-firebase-adminsdk-fbsvc-d1b31b3ebf.json

# Split credentials not needed when file is set
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

Expected startup log:

```text
[FcmProvider] Firebase Admin initialized via file
```

### Staging / production (inline JSON — no file on disk)

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ministry-mobile","client_email":"firebase-adminsdk-...@ministry-mobile.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
FIREBASE_SERVICE_ACCOUNT_FILE=
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY=
```

Expected startup log:

```text
[FcmProvider] Firebase Admin initialized via JSON env
```

### Alternative — split credentials

```env
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_FILE=
FCM_PROJECT_ID=ministry-mobile
FCM_CLIENT_EMAIL=firebase-adminsdk-...@ministry-mobile.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Expected startup log:

```text
[FcmProvider] Firebase Admin initialized via split credentials
```

---

## Security notes

1. **Do not commit** service account JSON files. Add `*-firebase-adminsdk-*.json` to `.gitignore` if not already ignored.
2. Use `FIREBASE_SERVICE_ACCOUNT_FILE` for **local dev only**. Staging/production should use `FIREBASE_SERVICE_ACCOUNT_JSON` or platform secret injection.
3. Startup logs indicate the **source** only — never the private key or full JSON.

---

## Verification checklist

After updating `services/api/.env`:

1. Restart API: `cd services/api && npm run start:dev`
2. Confirm log: `Firebase Admin initialized via file`
3. Optional: `node scripts/beta/validate-mobile-firebase.mjs` — Firebase Admin credentials should **PASS**
4. Send a test push (admin broadcast or targeted notification) to confirm FCM dispatch

---

## Verdict

**PASS** — Firebase Admin credential loading supports inline JSON, local JSON file path, and split `FCM_*` fallback with clear validation, startup logging, passing build, and dedicated unit tests.
