# NestJS Dependency Alignment Report

**Project:** `services/api` (Ministry Platform API)  
**Date:** 2026-07-01  
**Objective:** Resolve `npm install` ERESOLVE failures caused by mixed NestJS major versions.

---

## 1. Problem Summary

`package.json` declared NestJS packages across **two major versions**:

| Package | Before | After (resolved) |
|---------|--------|------------------|
| `@nestjs/common` | ^11.1.24 | 11.1.27 |
| `@nestjs/core` | **^7.5.5** | 11.1.27 |
| `@nestjs/platform-express` | ^11.1.24 | 11.1.27 |
| `@nestjs/platform-socket.io` | **^7.6.18** | 11.1.27 |
| `@nestjs/websockets` | **^7.6.18** | 11.1.27 |
| `@nestjs/testing` | **^7.5.5** | 11.1.27 |
| `@nestjs/jwt` | ^11.0.1 | (unchanged range) |
| `@nestjs/passport` | ^11.0.5 | (unchanged range) |
| `@nestjs/config` | ^4.0.4 | (unchanged range) |
| `@nestjs/throttler` | ^6.5.0 | (unchanged range) |
| `@nestjs/cli` | ^11.0.21 | (unchanged range) |
| `@nestjs/schematics` | ^11.1.0 | (unchanged range) |

This produced peer dependency conflicts during `npm install` because `@nestjs/common@11.x` requires `@nestjs/core@^11.0.0`, but `@nestjs/core@7.x` was pinned.

A secondary blocker appeared after aligning NestJS: `@sentry/nestjs@^8.19.0` only peer-supported NestJS `^8 || ^9 || ^10`, not `^11`.

---

## 2. Chosen NestJS Major Version

**NestJS 11** was selected because:

1. The majority of packages were already on v11 (`common`, `platform-express`, `jwt`, `passport`, `cli`, `schematics`).
2. NestJS 11 is the current stable line and matches the CLI/tooling already in use.
3. Downgrading everything to v7 would conflict with `@nestjs/jwt@11`, `@nestjs/passport@11`, and `@nestjs/throttler@6`.
4. The application code uses standard NestJS 11 patterns (guards, modules, websockets gateway) with no v7-specific APIs.

---

## 3. Changes Made

### 3.1 `package.json` — NestJS alignment

```json
"@nestjs/core": "^11.1.24",
"@nestjs/platform-socket.io": "^11.1.24",
"@nestjs/websockets": "^11.1.24",
"@nestjs/testing": "^11.1.24"
```

All `@nestjs/*` runtime and test packages now target **v11.1.24+**.

### 3.2 Peer dependency fix — Sentry

```json
"@sentry/nestjs": "^10.55.0"
```

Upgraded from `^8.19.0` to align with `@sentry/node@^10.55.0` and satisfy NestJS 11 peer requirements (`^8 || ^9 || ^10 || ^11`).

> Note: The app initializes Sentry via `@sentry/node` in `main.ts`. `@sentry/nestjs` remains as an optional integration package with correct peer deps.

### 3.3 Test toolchain alignment

Jest was on v25 (incompatible with `@nestjs/testing@11` and `ts-jest@29`):

```json
"jest": "^29.7.0",
"@types/jest": "^29.5.14"
```

Previously: `jest@^25.0.0`, `@types/jest@^30.0.0`.

### 3.4 Firebase Admin SDK (build compatibility)

`fcm.provider.ts` uses `sendEachForMulticast()`, which requires **firebase-admin ≥ 11.7.0**:

```json
"firebase-admin": "^12.7.0"
```

Previously: `^10.3.0` (API not present in types). No Firebase credentials or configuration were changed.

### 3.5 Build configuration

Added `tsconfig.build.json` to exclude `**/*spec.ts` from production builds (NestJS convention):

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

### 3.6 Test fixes (compatibility fallout)

| File | Fix |
|------|-----|
| `src/modules/auth/auth.service.spec.ts` | Added `subscriptionsService` mock (6th constructor arg) |
| `src/modules/subscriptions/trial-notification.service.spec.ts` | Fixed dedupe mock to persist metadata between calls |

### 3.7 Lockfile

- Deleted stale `package-lock.json`
- Regenerated via clean `npm install` (no `--force`, no `--legacy-peer-deps`)

---

## 4. Verification Results

| Command | Result |
|---------|--------|
| `npm install` | ✅ Success (exit 0, no ERESOLVE) |
| `npm run build` | ✅ Success |
| `npm test` | ✅ **36/36** test suites passed, **188/188** tests passed |

---

## 5. Resolved Dependency Tree (NestJS)

All installed `@nestjs/*` packages resolved to **11.1.27**:

```
@nestjs/common          11.1.27
@nestjs/core            11.1.27
@nestjs/platform-express 11.1.27
@nestjs/platform-socket.io 11.1.27
@nestjs/websockets      11.1.27
@nestjs/testing         11.1.27
```

---

## 6. Files Modified

| File | Change |
|------|--------|
| `services/api/package.json` | NestJS v11 alignment, Sentry, Jest, firebase-admin |
| `services/api/package-lock.json` | Regenerated |
| `services/api/tsconfig.build.json` | **New** — exclude spec files from build |
| `services/api/src/modules/auth/auth.service.spec.ts` | Constructor mock fix |
| `services/api/src/modules/subscriptions/trial-notification.service.spec.ts` | Dedupe mock fix |

---

## 7. Deployment Notes

After pulling these changes:

```bash
cd services/api
rm -rf node_modules          # optional but recommended on CI
npm install                  # must complete without ERESOLVE
npm run build
npm test
```

No environment variable changes required. Firebase service account configuration is unchanged; only the `firebase-admin` npm package version was upgraded.

---

## 8. What Was NOT Used

- `--force`
- `--legacy-peer-deps`
- npm `overrides` / `resolutions`

All conflicts were resolved by aligning package version ranges to compatible majors.

---

*Report generated after NestJS dependency alignment for the WOPP API backend.*
