# Branding Update Report

**Date:** 2026-06-16  
**Scope:** WOP mobile app branding, attribution, About screen, and store listing prep  
**Package ID:** Unchanged (`com.ministrymobile.app`)

---

## Executive Summary

Branding and developer attribution have been centralized in `AppConstants` and applied across the Flutter app UI, platform metadata, and store listing documentation. A new **About WOP** screen is accessible from the More tab, and the splash screen now displays the organization subtitle.

| Deliverable | Status |
|-------------|--------|
| About screen | Created |
| More → About WOP navigation | Added |
| Splash subtitle | Added |
| App metadata (Windows/macOS/web/pubspec) | Updated |
| Store listing metadata | Generated (`STORE_LISTING_METADATA.md`) |
| Branding widget tests | **7/7 pass** |
| Full-project `flutter analyze` | Pre-existing errors remain (unrelated) |
| Full-project `flutter test` | Pre-existing failures remain (unrelated) |

---

## Brand Identity Applied

| Field | Value |
|-------|-------|
| App Name | **WOP** |
| Organization | **Men and Women of Passion and Purpose** |
| Developers | **Michael Udoroh & Misan Mayuku Dore** |
| Version | `0.1.0` (build `1`) |
| Colors | Purple `#6A1B9A`, Gold `#D4AF37`, White |

---

## Files Changed

### New files

| File | Purpose |
|------|---------|
| `apps/mobile-flutter/lib/screens/about_screen.dart` | About WOP page with logo, credits, version, copyright |
| `apps/mobile-flutter/test/about_screen_test.dart` | Widget test for About screen content |
| `STORE_LISTING_METADATA.md` | Play Store / App Store copy and keywords |
| `BRANDING_UPDATE_REPORT.md` | This report |

### Modified files

| File | Change |
|------|--------|
| `lib/core/constants/app_constants.dart` | Organization, developers, version, copyright helpers |
| `lib/screens/more_screen.dart` | Added **App** section with **About WOP** menu item |
| `lib/screens/splash_screen.dart` | Added organization subtitle under **WOP** |
| `lib/app.dart` | `MaterialApp` title → `WOP` (via `AppConstants.appName`) |
| `lib/core/router/app_router.dart` | Registered `/about` route with RBAC |
| `pubspec.yaml` | Updated package description |
| `web/manifest.json` | Description, purple theme colors |
| `windows/runner/Runner.rc` | Company name and copyright |
| `macos/Runner/Configs/AppInfo.xcconfig` | Copyright attribution |
| `test/more_screen_test.dart` | About WOP visibility + navigation test |

### Unchanged (already correct)

| File | Notes |
|------|-------|
| `android/.../strings.xml` | Already `WOP` |
| `ios/Runner/Info.plist` | Already `WOP` display name |
| `lib/widgets/ministry_app_bar_title.dart` | Already uses `AppConstants.appName` |
| Firebase configs, API, auth | Not modified per requirements |

---

## About Screen Details

**Route:** `/about` (`AboutScreen.routeName`)

**Layout (purple / gold / white branding):**
- Hero `MinistryLogo` on white card with gold border accent
- **WOP** title (purple)
- **Powered by** → organization name (gold)
- **Developed by:** → Michael Udoroh & Misan Mayuku Dore (purple)
- App Information card: Version `0.1.0`, Build `1`
- Dynamic copyright: `© {year} Men and Women of Passion and Purpose. All rights reserved.`

**Access path:** Dashboard → More tab → **About WOP**

---

## Splash Screen

Displays:
1. Ministry logo (hero variant)
2. **WOP**
3. **Men and Women of Passion and Purpose** (gold subtitle)
4. Loading indicator + "Initializing session..."

No package names or bundle identifiers are shown.

---

## Store Listing Metadata

Generated at repository root: [`STORE_LISTING_METADATA.md`](STORE_LISTING_METADATA.md)

Includes:
- Short and full descriptions
- Publisher and developer credits
- Apple subtitle and promotional text templates
- ASO keywords (short + extended list)
- Category suggestions and screenshot caption ideas

---

## Validation Results

### Branding-specific tests

```text
flutter test test/about_screen_test.dart test/more_screen_test.dart
Result: 7/7 passed
```

### Branding-related analyze (scoped files)

```text
flutter analyze lib/screens/about_screen.dart lib/screens/more_screen.dart ...
Result: 0 errors, 5 info (prefer_const_constructors)
```

### Full project (informational)

Full `flutter analyze` and `flutter test` still fail due to **pre-existing** issues documented in `PACKAGE_RENAME_REPORT.md`:
- `MinistryMobileApp(theme: ...)` parameter mismatch
- Nullable `FirebaseMessaging?` in `firebase_messaging_service.dart`

These are unrelated to the branding update.

### Navigation routes

`/about` is registered in `AppRouter` with member/admin/user RBAC and compiles with the About screen import.

---

## Metadata Locations Reviewed

| Location | Updated? | Value |
|----------|----------|-------|
| `AppConstants` | Yes | Central source of truth |
| `MaterialApp.title` | Yes | WOP |
| `pubspec.yaml` description | Yes | Organization attribution |
| `web/manifest.json` | Yes | Name, description, purple theme |
| `windows/runner/Runner.rc` | Yes | CompanyName, LegalCopyright |
| `macos/AppInfo.xcconfig` | Yes | PRODUCT_COPYRIGHT |
| `android/strings.xml` | Already WOP | — |
| `ios/Info.plist` | Already WOP | — |
| Login/Register copy | Already references WOP | — |

---

## Remaining Recommendations

1. **Auto-sync version** — Consider adding `package_info_plus` so About screen reads version/build from the native bundle instead of manual `AppConstants` sync with `pubspec.yaml`.

2. **Auth landing subtitle** — Optionally add organization name under the Welcome card on `AuthLandingScreen` for consistency.

3. **Profile screen link** — Consider adding an About link on Profile alongside policies (optional UX improvement).

4. **Store assets** — Prepare screenshots using captions from `STORE_LISTING_METADATA.md` before submission.

5. **Fix pre-existing build errors** — Resolve `theme` parameter and FCM nullable issues to restore full CI green.

6. **iOS `aps-environment`** — Set to `production` before App Store release (separate from branding).

---

## Commands Executed

```powershell
Set-Location C:\new_wop_app\apps\mobile-flutter
flutter test test/about_screen_test.dart test/more_screen_test.dart
flutter analyze lib/screens/about_screen.dart lib/screens/more_screen.dart lib/screens/splash_screen.dart lib/core/constants/app_constants.dart lib/core/router/app_router.dart lib/app.dart
```

---

## Summary

| Item | Status |
|------|--------|
| WOP branding centralized | Done |
| About WOP screen | Done |
| More screen entry | Done |
| Splash subtitle | Done |
| Developer credits | Done |
| Store listing doc | Done |
| Package / Firebase / API / Auth | Unchanged |
