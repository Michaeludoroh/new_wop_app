#!/usr/bin/env node
/**
 * Validates production/staging secrets before deploy or API startup.
 * Usage: node scripts/env/validate-production-secrets.mjs [--mode=production|staging]
 */

const mode = process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1]
  || process.env.NODE_ENV
  || 'production';

const PLACEHOLDER_PATTERNS = [
  /^replace_with_/i,
  /^changeme$/i,
  /^prod_password$/i,
];

const REQUIRED_PRODUCTION = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'CORS_ORIGIN',
  'CONTENT_ACCESS_SECRET',
  'METRICS_AUTH_TOKEN',
  'API_PUBLIC_URL',
  'EMAIL_PROVIDER',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
  'GOOGLE_PLAY_PACKAGE_NAME',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
  'MOBILE_ANDROID_PREMIUM_PRODUCT_ID',
  'APPLE_SHARED_SECRET',
  'MOBILE_IOS_PREMIUM_PRODUCT_ID',
];

const MIN_SECRET_LENGTH = {
  JWT_ACCESS_SECRET: 32,
  JWT_REFRESH_SECRET: 32,
  CONTENT_ACCESS_SECRET: 32,
  METRICS_AUTH_TOKEN: 16,
};

function fail(message) {
  console.error(`[production-secrets] ${message}`);
  process.exit(1);
}

function isPlaceholder(value) {
  const trimmed = String(value).trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function validateRequired(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    fail(`Missing required secret: ${name}`);
  }
  if (isPlaceholder(value)) {
    fail(`Secret ${name} appears to be a placeholder value`);
  }
  const minLen = MIN_SECRET_LENGTH[name];
  if (minLen && String(value).trim().length < minLen) {
    fail(`Secret ${name} must be at least ${minLen} characters`);
  }
}

function main() {
  if (!['production', 'staging'].includes(mode)) {
    console.log(`[production-secrets] Skipped for mode=${mode}`);
    process.exit(0);
  }

  for (const key of REQUIRED_PRODUCTION) {
    validateRequired(key);
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    fail('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }

  if (process.env.EMAIL_PROVIDER === 'mock') {
    fail('EMAIL_PROVIDER=mock is not allowed in production/staging');
  }

  if (process.env.GOOGLE_PLAY_PACKAGE_NAME !== 'com.ministrymobile.app') {
    fail('GOOGLE_PLAY_PACKAGE_NAME must be com.ministrymobile.app for the shipped mobile app');
  }

  if (mode === 'production' && process.env.APPLE_USE_SANDBOX === 'true') {
    fail('APPLE_USE_SANDBOX must be false in production');
  }

  console.log(`[production-secrets] OK for mode=${mode}`);
}

main();
