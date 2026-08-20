#!/usr/bin/env node
/**
 * Writes .env.production from process environment (CI / deploy hosts).
 * Skips if file exists unless FORCE_MATERIALIZE=1.
 *
 * Public (non-secret) production URLs, preserved when unset:
 *   WEB_APP_URL=https://admin.woppandmopp.com
 *   USER_WEB_APP_URL=https://woppandmopp.com
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEYS = [
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
  'WEB_APP_URL',
  'USER_WEB_APP_URL',
  'WEBSOCKET_PORT',
  'WEBSOCKET_ONLY_MODE',
  'NEXT_PUBLIC_WEBSOCKET_URL',
  'NEXT_PUBLIC_API_BASE_URL',
  'EMAIL_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
  'SENTRY_DSN',
  'IMAGE_TAG',
];

/** Non-secret production origins. Never used to invent credentials. */
export const PRODUCTION_PUBLIC_URL_DEFAULTS = {
  WEB_APP_URL: 'https://admin.woppandmopp.com',
  USER_WEB_APP_URL: 'https://woppandmopp.com',
};

export function buildEnvLines(env) {
  const lines = ['# Materialized by scripts/deploy/materialize-production-env.mjs'];
  for (const key of KEYS) {
    const value = env[key];
    if (value != null && String(value).trim() !== '') {
      lines.push(`${key}=${value}`);
    }
  }

  for (const [key, fallback] of Object.entries(PRODUCTION_PUBLIC_URL_DEFAULTS)) {
    if (!lines.some((line) => line.startsWith(`${key}=`))) {
      lines.push(`${key}=${fallback}`);
    }
  }

  if (!lines.some((line) => line.startsWith('NODE_ENV='))) {
    lines.push(`NODE_ENV=${env.DEPLOY_ENV || 'production'}`);
  }
  if (!lines.some((line) => line.startsWith('IMAGE_TAG=')) && env.IMAGE_TAG) {
    lines.push(`IMAGE_TAG=${env.IMAGE_TAG}`);
  }

  return lines;
}

export function materializeProductionEnv({
  target,
  env,
  force,
  exists,
  write,
}) {
  if (exists(target) && force !== '1') {
    return { skipped: true, lines: [] };
  }

  const lines = buildEnvLines(env);
  write(target, `${lines.join('\n')}\n`);
  return { skipped: false, lines };
}

function main() {
  const target = resolve('.env.production');
  const result = materializeProductionEnv({
    target,
    env: process.env,
    force: process.env.FORCE_MATERIALIZE,
    exists: existsSync,
    write: writeFileSync,
  });

  if (result.skipped) {
    console.log('[materialize-env] .env.production exists — skipping');
    return;
  }

  console.log('[materialize-env] Wrote .env.production');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isDirectRun = invokedPath === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}
