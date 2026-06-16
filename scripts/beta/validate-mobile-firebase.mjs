#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readEnv(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(fullPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const androidConfig = fileExists('apps/mobile-flutter/android/app/google-services.json');
const androidExample = fileExists('apps/mobile-flutter/android/app/google-services.json.example');
const iosConfig = fileExists('apps/mobile-flutter/ios/Runner/GoogleService-Info.plist');
const iosExample = fileExists('apps/mobile-flutter/ios/Runner/GoogleService-Info.plist.example');
const androidManifest = fs.readFileSync(
  path.join(root, 'apps/mobile-flutter/android/app/src/main/AndroidManifest.xml'),
  'utf8',
);
const settingsGradle = fs.readFileSync(
  path.join(root, 'apps/mobile-flutter/android/settings.gradle.kts'),
  'utf8',
);
const appGradle = fs.readFileSync(
  path.join(root, 'apps/mobile-flutter/android/app/build.gradle.kts'),
  'utf8',
);
const infoPlist = fs.readFileSync(
  path.join(root, 'apps/mobile-flutter/ios/Runner/Info.plist'),
  'utf8',
);

check('Android google-services.json', androidConfig, androidConfig ? 'Present' : 'Missing (copy from google-services.json.example)');
check('Android google-services.json.example', androidExample, androidExample ? 'Present' : 'Missing template');
check('Google Services Gradle plugin (settings)', settingsGradle.includes('com.google.gms.google-services'), 'Plugin declared in settings.gradle.kts');
check('Google Services Gradle plugin (app)', appGradle.includes('com.google.gms.google-services'), 'Conditional apply in app/build.gradle.kts');
check('Android POST_NOTIFICATIONS permission', androidManifest.includes('android.permission.POST_NOTIFICATIONS'), 'Manifest declares POST_NOTIFICATIONS');
check('iOS GoogleService-Info.plist', iosConfig, iosConfig ? 'Present' : 'Missing (copy from GoogleService-Info.plist.example)');
check('iOS GoogleService-Info.plist.example', iosExample, iosExample ? 'Present' : 'Missing template');
check('iOS remote-notification background mode', infoPlist.includes('remote-notification'), 'Info.plist declares UIBackgroundModes remote-notification');

const apiEnv = readEnv('services/api/.env');
const hasServiceAccountJson = Boolean(apiEnv.FIREBASE_SERVICE_ACCOUNT_JSON);
const hasSplitCreds =
  Boolean(apiEnv.FCM_PROJECT_ID) && Boolean(apiEnv.FCM_CLIENT_EMAIL) && Boolean(apiEnv.FCM_PRIVATE_KEY);

const entitlementsPath = path.join(root, 'apps/mobile-flutter/ios/Runner/Runner.entitlements');
const entitlementsHasAps =
  fs.existsSync(entitlementsPath) && fs.readFileSync(entitlementsPath, 'utf8').includes('aps-environment');

check(
  'Firebase Admin credentials',
  hasServiceAccountJson || hasSplitCreds,
  hasServiceAccountJson
    ? 'FIREBASE_SERVICE_ACCOUNT_JSON set'
    : hasSplitCreds
      ? 'FCM_* vars set'
      : 'Missing FIREBASE_SERVICE_ACCOUNT_JSON or FCM_* vars',
);
check(
  'iOS push entitlements (aps-environment)',
  entitlementsHasAps,
  entitlementsHasAps
    ? 'Runner.entitlements declares aps-environment'
    : 'Missing aps-environment in Runner.entitlements',
);

const mobileStagingExample = fileExists('apps/mobile-flutter/.env.staging.example');
check(
  'Mobile staging API_BASE_URL template',
  mobileStagingExample,
  mobileStagingExample ? 'Present (.env.staging.example)' : 'Missing apps/mobile-flutter/.env.staging.example',
);

const passed = checks.filter((item) => item.ok).length;
const score = Math.round((passed / checks.length) * 100);

console.log('Mobile Firebase Infrastructure Audit');
console.log('===================================');
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} - ${item.name}: ${item.detail}`);
}
console.log('');
console.log(`Score: ${score}% (${passed}/${checks.length})`);

if (score < 100) {
  process.exitCode = 1;
}
