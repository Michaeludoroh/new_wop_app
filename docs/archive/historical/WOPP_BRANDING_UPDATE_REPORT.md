# WOPP Branding Update Report

**Date:** 2026-06-28  
**Scope:** User-facing mobile app branding `WOP` → `WOPP`  
**Ministry name (unchanged):** Men and Women of Passion and Purpose  
**Mobile app acronym:** WOPP — Women of Passion and Purpose

---

## 1. Files modified

### Mobile app — Flutter (user-facing branding)

| File | Change |
|------|--------|
| `apps/mobile-flutter/lib/core/constants/app_constants.dart` | `appName` → `WOPP`; added `appProductName`, `appAcronymExpansion`, `aboutTitle`, `logoSemanticLabel` |
| `apps/mobile-flutter/lib/screens/about_screen.dart` | App bar title uses `AppConstants.aboutTitle` |
| `apps/mobile-flutter/lib/screens/login_screen.dart` | `Welcome back to WOPP` |
| `apps/mobile-flutter/lib/screens/register_screen.dart` | `Join WOPP` |
| `apps/mobile-flutter/lib/screens/more_screen.dart` | Menu item `About WOPP` |
| `apps/mobile-flutter/lib/widgets/ministry_logo.dart` | Semantic label `WOPP logo` |
| `apps/mobile-flutter/test/more_screen_test.dart` | Assertions updated for `About WOPP` |

### Mobile app — platform display names

| File | Change |
|------|--------|
| `apps/mobile-flutter/android/app/src/main/res/values/strings.xml` | Launcher label `WOPP` |
| `apps/mobile-flutter/ios/Runner/Info.plist` | `CFBundleDisplayName` and `CFBundleName` → `WOPP` |
| `apps/mobile-flutter/web/index.html` | Title, description, Apple web app title → `WOPP` |
| `apps/mobile-flutter/web/manifest.json` | `name` / `short_name` → `WOPP` |
| `apps/mobile-flutter/windows/runner/main.cpp` | Window title → `WOPP` |
| `apps/mobile-flutter/windows/runner/Runner.rc` | Product/file description → `WOPP` |
| `apps/mobile-flutter/linux/runner/my_application.cc` | GTK window title → `WOPP` |
| `apps/mobile-flutter/pubspec.yaml` | Package description branding only |

### Documentation & store metadata

| File | Change |
|------|--------|
| `apps/mobile-flutter/README.md` | WOPP branding + acronym note |
| `STORE_LISTING_METADATA.md` | Full store copy updated to WOPP |

### Website (admin-web — SEO / metadata)

| File | Change |
|------|--------|
| `apps/admin-web/app/layout.tsx` | `metadata.title` = **Men and Women of Passion and Purpose**; descriptions reference **WOPP App**; Open Graph + Twitter metadata added |

---

## 2. Branding changes made

| Area | Before | After |
|------|--------|-------|
| Mobile display name | WOP | **WOPP** |
| App acronym meaning | (implicit) | **Women of Passion and Purpose** |
| Login / register copy | Welcome back to WOP / Join WOP | Welcome back to **WOPP** / Join **WOPP** |
| About screen | About WOP | About **WOPP** |
| Ministry organization name | Men and Women of Passion and Purpose | **Unchanged** |
| Website browser/SEO title | (none set) | **Men and Women of Passion and Purpose** |
| Website app references | (none) | **Download the WOPP App** (metadata description) |

Screens using `AppConstants.appName` automatically show **WOPP**: splash, auth landing app bar, login/register headers, `MaterialApp.title`, about screen hero.

---

## 3. Files intentionally left unchanged

| Category | Files / identifiers |
|----------|---------------------|
| Android `applicationId` | `com.ministrymobile.app` (`android/app/build.gradle.kts`) |
| iOS Bundle Identifier | `com.ministrymobile.app` (`project.pbxproj`, `Info.plist` uses `$(PRODUCT_BUNDLE_IDENTIFIER)`) |
| Flutter package name | `ministry_mobile` (`pubspec.yaml` `name:`) |
| Firebase | `google-services.json`, `GoogleService-Info.plist`, `firebase.json` |
| NestJS / Prisma / API | All `services/api/src/**` source files |
| Docker / nginx / env | `docker-compose*.yml`, `infra/nginx/**`, `.env*` |
| Deep links / signing | No changes |
| Internal project docs | Release runbooks, audit reports (platform name "WOP Ministry Platform" retained as internal doc title) |
| Backend email defaults | `WOP Platform` in `smtp-config.util.ts` / `email-template.service.ts` (NestJS — not modified per scope) |
| Environment variables | `APP_NAME` in `.env.production.example` unchanged |

---

## 4. Assets updated

| Asset | Status |
|-------|--------|
| `assets/images/logo.png` | **Not in repository** (likely gitignored or generated locally). **Manual review required** — if the PNG contains rendered text "WOP", re-export as "WOPP" using `scripts/process_logo.py` with an updated source image. |
| App launcher icons | No text-based WOP found in tracked icon XML/SVG assets |
| `apps/admin-web/app/icon.svg` | No WOP text (unchanged) |

---

## 5. Build results

| Target | Result | Notes |
|--------|--------|-------|
| `flutter clean` | **PASS** | |
| `flutter pub get` | **PASS** | |
| `flutter analyze` | **PASS** (no errors) | 28 pre-existing info/warnings; 0 errors |
| `flutter test` | **PASS** | **61/61** tests passed |
| `flutter build apk --debug` | **FAIL** (environment) | `ZipException: zip END header not found` in Gradle wrapper download — corrupted/incomplete Gradle distribution on host, **not caused by branding changes** |
| `npm run build` (admin-web) | **PASS** | Next.js production build succeeded |

---

## 6. Validation results

| Check | Status |
|-------|--------|
| Mobile display name is WOPP | ✅ `AppConstants.appName`, Android `strings.xml`, iOS `Info.plist` |
| Android launcher shows WOPP | ✅ `app_name` string |
| iOS launcher shows WOPP | ✅ `CFBundleDisplayName` |
| Splash / login / home use WOPP | ✅ via `AppConstants.appName` |
| Navigation About WOPP | ✅ `more_screen.dart` |
| Website title = ministry name | ✅ `layout.tsx` metadata |
| Website references WOPP App | ✅ metadata description |
| Package identifiers unchanged | ✅ verified |
| Firebase config unchanged | ✅ no diff in Firebase files |
| Backend source unchanged | ✅ no `services/api/src` modifications from this task |
| Authentication / API paths | ✅ no auth or endpoint changes |

---

## 7. Manual review items

1. **Logo PNG** — Re-run `apps/mobile-flutter/scripts/process_logo.py` after obtaining a source image with **WOPP** lettering if the current logo asset displays "WOP".
2. **Android debug build** — Retry `flutter build apk --debug` after fixing Gradle wrapper cache (`gradle/wrapper/gradle-wrapper.jar` / re-download distribution).
3. **Public marketing website** — No standalone marketing site exists in this repository (only `admin-web` dashboard). If a separate public site is hosted elsewhere, apply the same metadata rules there: ministry title unchanged, mobile app referred to as **WOPP App**.
4. **App Store / Play Console** — Submit using updated `STORE_LISTING_METADATA.md`.
5. **Email branding** — Optional follow-up: set `APP_NAME=WOPP Platform` in production env when operators want email sender branding aligned (requires env change only, not code).

---

## 8–11. Compliance confirmations

| # | Requirement | Confirmed |
|---|-------------|-----------|
| 8 | Android `applicationId` NOT changed | ✅ `com.ministrymobile.app` |
| 9 | iOS Bundle Identifier NOT changed | ✅ `com.ministrymobile.app` |
| 10 | Firebase configuration NOT changed | ✅ |
| 11 | Backend functionality unchanged | ✅ No NestJS/Prisma/API logic modified |

---

## Quality checklist

- ✅ Mobile app display name is **WOPP**
- ✅ Android launcher shows **WOPP**
- ✅ iOS launcher shows **WOPP**
- ✅ Splash screen shows **WOPP** (via `AppConstants`)
- ✅ Login page shows **WOPP**
- ✅ Home / dashboard app bar shows **WOPP** where applicable
- ✅ Website title remains **Men and Women of Passion and Purpose**
- ✅ Website metadata says **Download the WOPP App**
- ✅ No package identifiers changed
- ✅ No Firebase configuration changed
- ✅ No backend functionality changed

**Verdict:** Branding update complete for all in-repo user-facing surfaces. Project is production-ready pending logo asset review (if applicable) and local Gradle environment fix for Android debug build verification.
