#!/usr/bin/env node
/**
 * Prints flutter build/run commands for staging with API_BASE_URL dart-define.
 * Usage: node scripts/beta/build-mobile-staging.mjs [API_BASE_URL]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const examplePath = resolve(root, 'apps/mobile-flutter/.env.staging.example');
let apiBaseUrl = process.argv[2];

if (!apiBaseUrl && existsSync(examplePath)) {
  const match = readFileSync(examplePath, 'utf8').match(/^API_BASE_URL=(.+)$/m);
  if (match) {
    apiBaseUrl = match[1].trim();
  }
}

if (!apiBaseUrl) {
  apiBaseUrl = 'https://staging-api.example.com/api/v1';
}

const define = `--dart-define=API_BASE_URL=${apiBaseUrl}`;

console.log('Mobile staging build commands');
console.log('=============================');
console.log(`API_BASE_URL=${apiBaseUrl}`);
console.log('');
console.log('Android (device):');
console.log(`  cd apps/mobile-flutter && flutter run ${define}`);
console.log('');
console.log('Android (release APK):');
console.log(`  cd apps/mobile-flutter && flutter build apk --release ${define}`);
console.log('');
console.log('iOS (device):');
console.log(`  cd apps/mobile-flutter && flutter run ${define}`);
console.log('');
console.log('Note: Place google-services.json and GoogleService-Info.plist before building for push.');
