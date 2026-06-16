# Phase A Runbook — Stream Tokens + Staging Database

**Goal:** Close P0 stream-token failures and apply migrate/seed to the **staging** PostgreSQL instance.  
**Time:** ~45 minutes (credentials ready)  
**Prerequisites:** Staging API public URL known; staging `DATABASE_URL` available  
**Next phase:** [P0_CLOSURE_PLAN.md](../../P0_CLOSURE_PLAN.md) Phase B (SMTP)

---

## Before you start

| Item | You need |
|------|----------|
| Staging API base URL | e.g. `https://staging-api.example.com` (no trailing slash) |
| Staging PostgreSQL | Host, user, password, database name |
| Repo root | All commands run from `C:\new_wop_app` (or your clone path) |
| `services/api/.env` | Exists locally **or** you SSH to staging and edit there |

**Do not commit** real secrets. Use `.env.staging.example` as a template only.

---

## Step A1 — Confirm staging URLs (5 min)

Replace placeholders everywhere below:

| Placeholder | Example |
|-------------|---------|
| `STAGING_API` | `https://staging-api.example.com` |
| `STAGING_ADMIN` | `https://staging-admin.example.com` |

Write these down — used in A3 and later phases (Flutterwave webhook, mobile build).

---

## Step A2 — Generate `CONTENT_ACCESS_SECRET` (2 min)

Must be **≥32 characters**. Use a cryptographically random value **unique to staging** (never reuse JWT secrets).

### Windows (PowerShell)

```powershell
# From repo root
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "CONTENT_ACCESS_SECRET=$secret"
Write-Host "Length: $($secret.Length)"
```

### macOS / Linux

```bash
openssl rand -base64 32
```

Copy the output. Confirm length ≥ 32.

---

## Step A3 — Update `services/api/.env` (5 min)

Open `services/api/.env`. Set or add these lines (adjust URLs to your staging host):

```env
# Phase A — eBook streaming (required for beta)
CONTENT_ACCESS_SECRET=PASTE_YOUR_32_PLUS_CHAR_SECRET_HERE
API_PUBLIC_URL=https://staging-api.example.com
```

**Optional but recommended** while editing (needed in Phase B/C — can leave blank for Phase A validation of stream tokens only if both above are set):

```env
NODE_ENV=staging
DATABASE_URL=postgresql://USER:PASSWORD@staging-db-host:5432/ministry_platform_staging?schema=public
CORS_ORIGIN=https://staging-admin.example.com
```

### Merge from template (if `.env` is sparse)

Compare against repo root [`.env.staging.example`](../../.env.staging.example) and [ `services/api/.env.example` ](../../services/api/.env.example).

---

## Step A4 — Staging database migrate + seed (20 min)

### 4a. Point `DATABASE_URL` at staging

In `services/api/.env`:

```env
DATABASE_URL=postgresql://staging_user:staging_password@YOUR_STAGING_DB_HOST:5432/ministry_platform_staging?schema=public
```

**Important:** If you previously seeded **local** Postgres, switching `DATABASE_URL` to staging means validators now check **staging**, not local.

### 4b. Run migrate + seed

From **repo root**:

```bash
node scripts/beta/setup-staging-db.mjs
```

**Expected output:**

```
[setup-staging-db] migrate deploy...
[setup-staging-db] seed...
[setup-staging-db] Database migrate + seed completed.
```

### 4c. Verify policy seed

```bash
node scripts/beta/verify-policy-seed.mjs
```

**Expected:** exit code **0** — four published policy types verified.

If this fails:

- Confirm `DATABASE_URL` reaches staging (firewall, SSL params)
- Re-run `setup-staging-db.mjs`
- Check API logs for Prisma connection errors

---

## Step A5 — Re-run validators (5 min)

From **repo root**:

```bash
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
```

### Expected after Phase A (partial progress)

#### `validate-beta-env.mjs`

| Check | Expected |
|-------|----------|
| Stream token configuration | **`[PASS]`** |
| Upload proxy configuration | **`[PASS]`** (unchanged) |
| SMTP configuration | **`[FAIL]`** until Phase B |
| Flutterwave configuration | **`[FAIL]`** until Phase C |

Exit code may still be **1** (SMTP + Flutterwave remain). **That is OK for end of Phase A** if stream shows **PASS**.

Example stream PASS line:

```
[PASS] Stream token configuration: Stream tokens use dedicated secret; public URL https://staging-api.example.com.
```

#### `validate-mobile-firebase.mjs`

Unchanged from before Phase A (82% until Firebase Admin + iOS plist in Phase D).  
Android `google-services.json` should remain **PASS**.

#### `validate-pre-beta.mjs`

| Item | Expected |
|------|----------|
| eBook streaming secrets configured | **`[PASS]`** |
| Database migrate + seed applied | **`[PASS]`** (if `verify-policy-seed` passed) |
| SMTP / Flutterwave / Firebase Admin | **`[FAIL]`** until later phases |

**FAIL count should drop by 1** (stream tokens) vs pre–Phase A baseline.

---

## Step A6 — Admin banner (manual, staging deploy required)

After staging API + admin web point at the **same** seeded database:

1. Open `https://staging-admin.example.com` (or your admin URL)
2. Log in as admin
3. Go to **Policies**
4. Confirm publish-readiness banner is **green** / ready (four policy types)

This completes the **Staging Database** manual gate. Mark `[MANUAL] Admin publish-readiness banner` when done.

---

## Phase A completion checklist

- [ ] `CONTENT_ACCESS_SECRET` set (≥32 chars, unique)
- [ ] `API_PUBLIC_URL` set to staging public host
- [ ] `DATABASE_URL` points to **staging** PostgreSQL
- [ ] `node scripts/beta/setup-staging-db.mjs` completed without error
- [ ] `node scripts/beta/verify-policy-seed.mjs` exit **0**
- [ ] `validate-beta-env.mjs` → Stream token **`[PASS]`**
- [ ] `validate-pre-beta.mjs` → eBook streaming **`[PASS]`**, DB seed **`[PASS]`**
- [ ] Admin policies banner green on staging (manual)

---

## Quick command block (copy-paste)

```bash
# Repo root — after editing services/api/.env

node scripts/beta/setup-staging-db.mjs
node scripts/beta/verify-policy-seed.mjs
node scripts/beta/validate-beta-env.mjs
node scripts/beta/validate-mobile-firebase.mjs
node scripts/beta/validate-pre-beta.mjs
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stream still **WARN** | Secret &lt;32 chars or typo in key name `CONTENT_ACCESS_SECRET` |
| Stream **FAIL** on `API_PUBLIC_URL` | Set full staging URL; no trailing slash required but must not be empty |
| `setup-staging-db` connection refused | Check `DATABASE_URL`, VPN, security group, Postgres listening on 5432 |
| `verify-policy-seed` fails after migrate | Re-run seed; inspect `services/api/prisma/seed.ts` policy section |
| Policy banner not green on admin | Admin must use same DB as API; re-seed staging; hard-refresh admin |

---

## What Phase A does **not** close

Still **FAIL** until later phases:

- SMTP → **Phase B** ([EXTERNAL_SETUP.md §1](EXTERNAL_SETUP.md))
- Flutterwave → **Phase C** ([EXTERNAL_SETUP.md §2](EXTERNAL_SETUP.md))
- Firebase Admin + iOS plist + APNs → **Phase D** ([EXTERNAL_SETUP.md §4–6](EXTERNAL_SETUP.md))
- Device QA + full E2E → **Phase E–F**

Proceed to **Phase B** in [P0_CLOSURE_PLAN.md](../../P0_CLOSURE_PLAN.md) once stream token and staging DB checks above are green.

---

*Phase A of P0 Closure Plan — June 2026*
