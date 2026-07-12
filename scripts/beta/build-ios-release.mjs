#!/usr/bin/env node
/**
 * Prints iOS production archive / IPA commands.
 * Must be run on macOS with Xcode + Apple Developer team configured.
 *
 * Usage: node scripts/beta/build-ios-release.mjs [API_BASE_URL]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const prodExamplePath = resolve(root, '.env.production.example');
let apiBaseUrl = process.argv[2];

if (!apiBaseUrl && existsSync(prodExamplePath)) {
  const match = readFileSync(prodExamplePath, 'utf8').match(/^API_PUBLIC_URL=(.+)$/m);
  if (match) {
    apiBaseUrl = `${match[1].trim()}/api/v1`;
  }
}

if (!apiBaseUrl) {
  apiBaseUrl = 'https://api.example.com/api/v1';
}

const defines = [
  `--dart-define=API_BASE_URL=${apiBaseUrl}`,
  '--dart-define=MOBILE_IOS_PREMIUM_PRODUCT_ID=wopp_premium_monthly',
  '--dart-define=MOBILE_ANDROID_PREMIUM_PRODUCT_ID=wopp_premium_monthly',
].join(' ');

console.log('iOS production archive commands (macOS + Xcode required)');
console.log('=======================================================');
console.log(`API_BASE_URL=${apiBaseUrl}`);
console.log('');
console.log('Prerequisites (Apple Developer Portal / Xcode):');
console.log('  1. Open ios/Runner.xcworkspace in Xcode');
console.log('  2. Select Runner → Signing & Capabilities');
console.log('  3. Choose your Team (Automatic signing is already enabled)');
console.log('  4. Confirm Push Notifications + In-App Purchase capabilities');
console.log('  5. Ensure App ID com.ministrymobile.app has Push + IAP enabled');
console.log('  6. Upload APNs key to Firebase for production push');
console.log('');
console.log('Build IPA:');
console.log(`  cd apps/mobile-flutter && flutter build ipa --release ${defines}`);
console.log('');
console.log('Optional export options:');
console.log('  Copy ios/ExportOptions.plist.example → ExportOptions.plist');
console.log(`  flutter build ipa --release ${defines} --export-options-plist=ios/ExportOptions.plist`);
