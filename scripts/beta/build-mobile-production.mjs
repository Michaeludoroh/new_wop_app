#!/usr/bin/env node
/**
 * Prints flutter production build commands with required dart-defines.
 * Usage: node scripts/beta/build-mobile-production.mjs [API_BASE_URL]
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
  '--dart-define=MOBILE_ANDROID_PREMIUM_PRODUCT_ID=wopp_premium_monthly',
  '--dart-define=MOBILE_IOS_PREMIUM_PRODUCT_ID=wopp_premium_monthly',
].join(' ');

console.log('Mobile production build commands');
console.log('================================');
console.log(`API_BASE_URL=${apiBaseUrl}`);
console.log('');
console.log('Prerequisites:');
console.log('  1. android/key.properties configured (see android/key.properties.example)');
console.log('  2. google-services.json and GoogleService-Info.plist present');
console.log('');
console.log('Android App Bundle (Play Store):');
console.log(`  cd apps/mobile-flutter && flutter build appbundle --release ${defines}`);
console.log('');
console.log('Android APK:');
console.log(`  cd apps/mobile-flutter && flutter build apk --release ${defines}`);
console.log('');
console.log('iOS archive (macOS + Xcode required):');
console.log(`  cd apps/mobile-flutter && flutter build ipa --release ${defines}`);
