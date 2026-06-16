#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.env.NODE_ENV || process.env.APP_ENV || 'staging';
const root = resolve(process.cwd());
const apiEnvPath = resolve(root, 'services/api/.env');
const mainTsPath = resolve(root, 'services/api/src/main.ts');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const entries = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    entries[key] = value;
  }
  return entries;
}

const fileEnv = loadEnvFile(apiEnvPath);
const env = { ...fileEnv, ...process.env };

const checks = [
  {
    id: 'smtp',
    label: 'SMTP configuration',
    required: ['SMTP_HOST', 'SMTP_FROM'],
    recommended: ['SMTP_USER', 'SMTP_PASS', 'WEB_APP_URL', 'APP_NAME'],
    validate(values) {
      if (!values.SMTP_HOST) {
        return { status: 'FAIL', detail: 'SMTP_HOST is not set; email will use MockSmtpProvider.' };
      }
      if (!values.SMTP_FROM) {
        return { status: 'FAIL', detail: 'SMTP_FROM is not set.' };
      }
      return { status: 'PASS', detail: `SMTP host configured (${values.SMTP_HOST}).` };
    },
  },
  {
    id: 'stream-token',
    label: 'Stream token configuration',
    required: ['CONTENT_ACCESS_SECRET', 'API_PUBLIC_URL'],
    validate(values) {
      const secret = values.CONTENT_ACCESS_SECRET;
      const publicUrl = values.API_PUBLIC_URL;
      if (!secret || secret.length < 32) {
        return {
          status: 'WARN',
          detail: 'CONTENT_ACCESS_SECRET missing or shorter than 32 chars; JWT/dev fallback may be used.',
        };
      }
      if (!publicUrl) {
        return { status: 'FAIL', detail: 'API_PUBLIC_URL is not set; stream URLs may point to localhost.' };
      }
      return { status: 'PASS', detail: `Stream tokens use dedicated secret; public URL ${publicUrl}.` };
    },
  },
  {
    id: 'upload-proxy',
    label: 'Upload proxy configuration',
    validate() {
      if (!existsSync(mainTsPath)) {
        return { status: 'FAIL', detail: 'main.ts not found.' };
      }
      const source = readFileSync(mainTsPath, 'utf8');
      const blocksDirectPdf = source.includes('/api/v1/uploads/ebooks/file');
      const servesStaticUploads = source.includes("express.static(join(process.cwd(), 'uploads'))");
      if (!blocksDirectPdf) {
        return { status: 'FAIL', detail: 'Direct eBook PDF block middleware not found in main.ts.' };
      }
      if (!servesStaticUploads) {
        return { status: 'WARN', detail: 'Static upload serving not detected.' };
      }
      return {
        status: 'PASS',
        detail: 'Direct premium PDF path blocked; static uploads remain enabled for covers.',
      };
    },
  },
  {
    id: 'flutterwave',
    label: 'Flutterwave configuration',
    required: ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET', 'PAYMENT_REDIRECT_BASE_URL'],
    validate(values) {
      const missing = ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET', 'PAYMENT_REDIRECT_BASE_URL'].filter(
        (key) => !values[key],
      );
      if (missing.length > 0) {
        return {
          status: 'FAIL',
          detail: `Missing Flutterwave env vars: ${missing.join(', ')}`,
        };
      }
      return {
        status: 'PASS',
        detail: 'Flutterwave secret, webhook secret, and redirect base URL are configured.',
      };
    },
  },
];

const results = checks.map((check) => ({
  id: check.id,
  label: check.label,
  ...check.validate(env),
}));

const failed = results.filter((item) => item.status === 'FAIL');
const warnings = results.filter((item) => item.status === 'WARN');

console.log(`[beta:env] mode=${mode} envFile=${existsSync(apiEnvPath) ? apiEnvPath : 'missing'}`);
for (const result of results) {
  console.log(`[${result.status}] ${result.label}: ${result.detail}`);
}

if (failed.length > 0) {
  console.error(`[beta:env] ${failed.length} blocking check(s) failed.`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`[beta:env] ${warnings.length} warning(s); review before beta launch.`);
}

console.log('[beta:env] Beta environment validation passed with no blocking failures.');
