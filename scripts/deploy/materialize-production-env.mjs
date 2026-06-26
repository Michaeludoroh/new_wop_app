#!/usr/bin/env node
/**
 * Writes .env.production from process environment (CI / deploy hosts).
 * Skips if file exists unless FORCE_MATERIALIZE=1.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve('.env.production');

const KEYS = [
  'NODE_ENV',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_ADAPTER_ENABLED',
  'PORT',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'RATE_LIMIT_TTL_MS',
  'RATE_LIMIT_LIMIT',
  'CORS_ORIGIN',
  'METRICS_AUTH_TOKEN',
  'CONTENT_ACCESS_SECRET',
  'API_PUBLIC_URL',
  'WEBSOCKET_PORT',
  'WEBSOCKET_ONLY_MODE',
  'NEXT_PUBLIC_WEBSOCKET_URL',
  'NEXT_PUBLIC_API_BASE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET',
  'PAYMENT_REDIRECT_BASE_URL',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
  'SENTRY_DSN',
  'IMAGE_TAG',
];

function main() {
  if (existsSync(target) && process.env.FORCE_MATERIALIZE !== '1') {
    console.log('[materialize-env] .env.production exists — skipping');
    return;
  }

  const lines = ['# Materialized by scripts/deploy/materialize-production-env.mjs'];
  for (const key of KEYS) {
    const value = process.env[key];
    if (value != null && String(value).trim() !== '') {
      lines.push(`${key}=${value}`);
    }
  }

  if (!lines.some((l) => l.startsWith('NODE_ENV='))) {
    lines.push(`NODE_ENV=${process.env.DEPLOY_ENV || 'production'}`);
  }
  if (!lines.some((l) => l.startsWith('IMAGE_TAG=')) && process.env.IMAGE_TAG) {
    lines.push(`IMAGE_TAG=${process.env.IMAGE_TAG}`);
  }

  writeFileSync(target, `${lines.join('\n')}\n`);
  console.log('[materialize-env] Wrote .env.production');
}

main();
