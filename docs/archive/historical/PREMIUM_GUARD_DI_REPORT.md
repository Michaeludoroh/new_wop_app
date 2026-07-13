# Premium Guard Dependency Injection Report

**Project:** `services/api`  
**Date:** 2026-07-01  
**Error:** `Nest can't resolve dependencies of the PremiumAccessGuard (?)` in `LibraryModule`

---

## 1. Root Cause

`PremiumAccessGuard` injects `SubscriptionsService` in its constructor:

```typescript
@Injectable()
export class PremiumAccessGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}
  // ...
}
```

The `@RequirePremium()` decorator applies this guard via `UseGuards(PremiumAccessGuard)` on controller routes.

**NestJS rule:** Guards used in a module's controllers must have their dependencies available in **that module's import graph**. Importing another module (e.g. `EbooksModule`) does **not** automatically expose sibling modules' exported providers to guards on `LibraryController`.

### What was wrong

| Module | Uses `@RequirePremium()` | Imported `SubscriptionsModule` |
|--------|--------------------------|--------------------------------|
| `EbooksModule` | Yes (`GET /ebooks/library`) | ✅ Yes |
| `LibraryModule` | Yes (`GET /library`) | ❌ **No** (only `EbooksModule`) |

`SubscriptionsModule` already exported both `SubscriptionsService` and `PremiumAccessGuard`. The failure was solely that `LibraryModule` never imported `SubscriptionsModule`.

---

## 2. Fix Applied

**File:** `src/modules/library/library.module.ts`

```diff
 import { Module } from '@nestjs/common';
 import { EbooksModule } from '../ebooks/ebooks.module';
+import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
 import { LibraryController } from './library.controller';

 @Module({
-  imports: [EbooksModule],
+  imports: [EbooksModule, SubscriptionsModule],
   controllers: [LibraryController],
 })
 export class LibraryModule {}
```

No `forwardRef` was required — there is no circular dependency between `LibraryModule` and `SubscriptionsModule`.

---

## 3. Module Audit

### SubscriptionsModule (unchanged — already correct)

- **Providers:** `SubscriptionsService`, `PremiumAccessGuard`, lifecycle services, etc.
- **Exports:** `SubscriptionsService`, `PremiumAccessGuard`, `SubscriptionLifecycleService`, `ContentAccessService`

### Modules using `@RequirePremium()`

| Controller | Module | `SubscriptionsModule` import |
|------------|--------|------------------------------|
| `EbooksController` | `EbooksModule` | ✅ Already present |
| `LibraryController` | `LibraryModule` | ✅ **Added** |

No other controllers use `@RequirePremium()` or `PremiumAccessGuard` directly.

### Circular dependencies

- `SubscriptionsModule` ↔ `PaymentsModule` uses `forwardRef` (pre-existing, unrelated).
- `LibraryModule` → `EbooksModule` → `SubscriptionsModule` is a one-way chain; no cycle introduced.

---

## 4. Verification

| Command | Result |
|---------|--------|
| `npm install` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm test` | ✅ 36/36 suites, 188/188 tests |
| `npm run start` | ✅ `Nest application successfully started` — no `UnknownDependenciesException` |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `services/api/src/modules/library/library.module.ts` | Import `SubscriptionsModule` |

**Not modified:** Docker, Prisma, guard implementation, or `SubscriptionsModule` exports.

---

## 5. Deployment

Redeploy the API after pulling this change. No migration or environment variable updates required.

---

*Report generated after fixing PremiumAccessGuard DI in LibraryModule.*
