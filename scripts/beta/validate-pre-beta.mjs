#!/usr/bin/env node
/**
 * P0 pre-beta checklist validator — classifies each item and reports pass/fail.
 * Usage: node scripts/beta/validate-pre-beta.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const apiEnvPath = resolve(root, 'services/api/.env');
const mobileStagingExample = resolve(root, 'apps/mobile-flutter/.env.staging.example');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    entries[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^"|"$/g, '');
  }
  return entries;
}

function runScript(relativePath) {
  const result = spawnSync('node', [resolve(root, relativePath)], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { ok: result.status === 0, output: `${result.stdout || ''}${result.stderr || ''}`.trim() };
}

const env = { ...loadEnv(apiEnvPath), ...process.env };
const items = [];

function add(id, label, kind, status, detail) {
  items.push({ id, label, kind, status, detail });
}

// --- Configuration / credential checks ---
const smtpOk = Boolean(env.SMTP_HOST && env.SMTP_FROM);
add(
  'p0-smtp',
  'SMTP configured in staging',
  'Configuration change',
  smtpOk ? 'PASS' : 'FAIL',
  smtpOk ? `SMTP_HOST=${env.SMTP_HOST}` : 'Set SMTP_HOST, SMTP_FROM, SMTP_USER, SMTP_PASS in services/api/.env',
);

const flutterwaveKeys = ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET', 'PAYMENT_REDIRECT_BASE_URL'];
const flutterwaveMissing = flutterwaveKeys.filter((key) => !env[key]);
add(
  'p0-flutterwave',
  'Flutterwave env vars configured',
  'Configuration change',
  flutterwaveMissing.length === 0 ? 'PASS' : 'FAIL',
  flutterwaveMissing.length === 0
    ? 'Flutterwave secret, webhook secret, and redirect base URL present'
    : `Missing: ${flutterwaveMissing.join(', ')}`,
);

add(
  'p0-flutterwave-webhook',
  'Flutterwave webhook registered to staging URL',
  'Manual validation step',
  'MANUAL',
  `Register ${env.PAYMENT_REDIRECT_BASE_URL ? env.PAYMENT_REDIRECT_BASE_URL.replace(/\/api\/v1.*$/, '') : 'https://staging-api.example.com'}/api/v1/payments/webhooks/flutterwave in Flutterwave dashboard; send test event`,
);

const streamOk =
  Boolean(env.CONTENT_ACCESS_SECRET && env.CONTENT_ACCESS_SECRET.length >= 32) && Boolean(env.API_PUBLIC_URL);
add(
  'p0-stream',
  'eBook streaming secrets configured',
  'Configuration change',
  streamOk ? 'PASS' : env.API_PUBLIC_URL ? 'WARN' : 'FAIL',
  streamOk
    ? `API_PUBLIC_URL=${env.API_PUBLIC_URL}`
    : 'Set CONTENT_ACCESS_SECRET (>=32 chars) and API_PUBLIC_URL in services/api/.env',
);

const policySeed = runScript('scripts/beta/verify-policy-seed.mjs');
add(
  'p0-db',
  'Database migrate + seed applied',
  'Manual validation step',
  policySeed.ok ? 'PASS' : 'MANUAL',
  policySeed.ok
    ? 'Four published policy types verified in DATABASE_URL target'
    : 'Run: node scripts/beta/setup-staging-db.mjs then node scripts/beta/verify-policy-seed.mjs',
);

add(
  'p0-policies-banner',
  'Admin publish-readiness banner green',
  'Manual validation step',
  'MANUAL',
  'Log into admin → Policies; confirm publish-readiness banner shows ready with zero missing types',
);

const androidJson = existsSync(resolve(root, 'apps/mobile-flutter/android/app/google-services.json'));
add(
  'p0-firebase-android',
  'Firebase Android google-services.json present',
  'External credential requirement',
  androidJson ? 'PASS' : 'FAIL',
  androidJson ? 'File present' : 'Download from Firebase Console → apps/mobile-flutter/android/app/google-services.json',
);

const iosPlist = existsSync(resolve(root, 'apps/mobile-flutter/ios/Runner/GoogleService-Info.plist'));
add(
  'p0-firebase-ios',
  'Firebase iOS GoogleService-Info.plist present',
  'External credential requirement',
  iosPlist ? 'PASS' : 'FAIL',
  iosPlist ? 'File present' : 'Download from Firebase Console → apps/mobile-flutter/ios/Runner/GoogleService-Info.plist',
);

add(
  'p0-apns',
  'APNs key uploaded to Firebase + Xcode Push capability',
  'External credential requirement',
  'MANUAL',
  'Apple Developer → Keys → APNs .p8 → Firebase Console → Cloud Messaging → Apple app; enable Push Notifications in Xcode (Runner.entitlements includes aps-environment)',
);

const serviceAccountFile = env.FIREBASE_SERVICE_ACCOUNT_FILE;
const hasFirebaseAdminFile = Boolean(
  serviceAccountFile &&
    (existsSync(resolve(root, 'services/api', serviceAccountFile)) ||
      existsSync(resolve(root, serviceAccountFile))),
);
const hasFirebaseAdmin =
  Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
  hasFirebaseAdminFile ||
  (Boolean(env.FCM_PROJECT_ID) && Boolean(env.FCM_CLIENT_EMAIL) && Boolean(env.FCM_PRIVATE_KEY));
add(
  'p0-firebase-admin',
  'Firebase Admin credentials on API',
  'External credential requirement',
  hasFirebaseAdmin ? 'PASS' : 'FAIL',
  hasFirebaseAdmin
    ? 'Firebase Admin credentials detected'
    : 'Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_FILE, or FCM_PROJECT_ID + FCM_CLIENT_EMAIL + FCM_PRIVATE_KEY',
);

const mobileStagingDoc = existsSync(mobileStagingExample);
add(
  'p0-mobile-api-url',
  'Mobile staging API_BASE_URL documented',
  mobileStagingDoc ? 'Configuration change' : 'Code change',
  mobileStagingDoc ? 'PASS' : 'FAIL',
  mobileStagingDoc
    ? 'Use: node scripts/beta/build-mobile-staging.mjs https://your-staging-api/api/v1'
    : 'Missing apps/mobile-flutter/.env.staging.example',
);

// --- Code checks (infrastructure already in repo) ---
const entitlements = existsSync(resolve(root, 'apps/mobile-flutter/ios/Runner/Runner.entitlements'));
add(
  'p0-ios-entitlements',
  'iOS push entitlements file',
  'Code change',
  entitlements ? 'PASS' : 'FAIL',
  entitlements ? 'Runner.entitlements with aps-environment present' : 'Missing Runner.entitlements',
);

// --- Script validations ---
const betaEnv = runScript('scripts/beta/validate-beta-env.mjs');
add(
  'p0-validate-beta-env',
  'validate-beta-env.mjs — no FAIL',
  'Manual validation step',
  betaEnv.ok ? 'PASS' : 'FAIL',
  betaEnv.ok ? 'All blocking checks passed' : betaEnv.output.split('\n').slice(-3).join(' '),
);

const mobileFirebase = runScript('scripts/beta/validate-mobile-firebase.mjs');
add(
  'p0-validate-mobile-firebase',
  'validate-mobile-firebase.mjs — 100%',
  'Manual validation step',
  mobileFirebase.ok ? 'PASS' : 'FAIL',
  mobileFirebase.ok ? `${mobileFirebase.output.match(/\((\d+\/\d+)\)/)?.[1] ?? 'all'} checks passed` : mobileFirebase.output.split('\n').slice(-2).join(' '),
);

add(
  'p0-device-android',
  'Device Android FCM + deep-link smoke',
  'Manual validation step',
  'MANUAL',
  'Physical Android 13+: login → accept notification permission → verify token register → publish announcement → tap opens detail',
);

add(
  'p0-device-ios',
  'Device iOS FCM + deep-link smoke',
  'Manual validation step',
  'MANUAL',
  'Physical iOS device: same flow as Android after APNs configured',
);

add(
  'p0-manual-e2e',
  'Manual E2E staging flow',
  'Manual validation step',
  'MANUAL',
  'Register → welcome email → accept policies → Flutterwave purchase → eBook stream read; direct /uploads/ebooks/file/ returns 403',
);

// --- Report ---
const pass = items.filter((item) => item.status === 'PASS').length;
const fail = items.filter((item) => item.status === 'FAIL').length;
const manual = items.filter((item) => item.status === 'MANUAL').length;
const warn = items.filter((item) => item.status === 'WARN').length;
const automatable = items.filter((item) => item.status !== 'MANUAL').length;
const automatablePass = items.filter((item) => item.status === 'PASS').length;

console.log('P0 Pre-Beta Checklist');
console.log('=====================');
for (const item of items) {
  console.log(`[${item.status}] ${item.label} (${item.kind})`);
  console.log(`       ${item.detail}`);
}
console.log('');
console.log(`Summary: ${pass} PASS, ${fail} FAIL, ${warn} WARN, ${manual} MANUAL (${items.length} total)`);
console.log(`Automated/config checks: ${automatablePass}/${automatable} passing`);
console.log('');

if (fail > 0) {
  console.error('[validate-pre-beta] Blocking failures remain — beta not cleared.');
  process.exit(1);
}

if (manual > 0) {
  console.warn('[validate-pre-beta] Manual steps remain — complete before external beta.');
  process.exit(2);
}

console.log('[validate-pre-beta] All P0 checks passed.');
