#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const mode = process.env.NODE_ENV || process.env.APP_ENV || 'development';
const target = getTarget();

const TARGETS = {
  api: {
    required: [
      'NODE_ENV',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'JWT_ACCESS_EXPIRES_IN',
      'JWT_REFRESH_EXPIRES_IN',
    ],
    requiredByMode: {
      production: ['CORS_ORIGIN'],
      staging: ['CORS_ORIGIN'],
    },
    optionalBoolean: ['REDIS_ADAPTER_ENABLED', 'WEBSOCKET_ONLY_MODE'],
    obsolete: ['JWT_SECRET', 'JWT_EXPIRES_IN'],
  },
  'admin-web': {
    required: ['NODE_ENV', 'NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_WEBSOCKET_URL'],
    requiredByMode: {},
    optionalBoolean: ['NEXT_PUBLIC_DEBUG_AUTH_GATE'],
    obsolete: ['JWT_SECRET', 'JWT_EXPIRES_IN'],
  },
  mobile: {
    required: ['APP_ENV', 'API_BASE_URL'],
    requiredByMode: {},
    optionalBoolean: [],
    obsolete: ['JWT_SECRET', 'JWT_EXPIRES_IN'],
  },
};

function fail(message) {
  console.error(`[env:validate] ${message}`);
  process.exit(1);
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function getTarget() {
  const explicit = getArgValue('target');
  if (explicit) return explicit;

  const cwd = process.cwd().replace(/\\/g, '/');
  if (cwd.endsWith('/services/api')) return 'api';
  if (cwd.endsWith('/apps/admin-web')) return 'admin-web';
  if (cwd.endsWith('/apps/mobile-flutter')) return 'mobile';
  return 'api';
}

function validateBoolean(name, value) {
  if (value == null || value === '') return;
  if (!['true', 'false'].includes(String(value).toLowerCase())) {
    fail(`${name} must be "true" or "false"`);
  }
}

function requireValue(name) {
  if (!process.env[name] || String(process.env[name]).trim() === '') {
    fail(`Missing required environment variable for ${target}: ${name}`);
  }
}

function validateUrl(name, value) {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:', 'ws:', 'wss:', 'postgresql:', 'redis:'].includes(parsed.protocol)) {
      fail(`${name} has unsupported URL protocol: ${parsed.protocol}`);
    }
  } catch {
    fail(`${name} must be a valid URL`);
  }
}

function validateDuration(name, value) {
  if (!value) return;
  if (!/^\d+([smhd])?$/i.test(String(value).trim())) {
    fail(`${name} must be a duration like "15m", "7d", or seconds`);
  }
}

function validateTemplateFile(path) {
  if (!existsSync(path)) {
    fail(`Template file not found: ${path}`);
  }

  const content = readFileSync(path, 'utf8');
  const file = basename(path);
  if (/\bJWT_SECRET=/.test(content) || /\bJWT_EXPIRES_IN=/.test(content)) {
    fail(`${file} still contains obsolete JWT_SECRET/JWT_EXPIRES_IN variables`);
  }
}

if (process.argv.includes('--check-templates')) {
  [
    '.env.example',
    '.env.staging.example',
    '.env.production.example',
    'services/api/.env.example',
    'apps/admin-web/.env.example',
    'apps/mobile-flutter/.env.example',
  ].forEach((file) => validateTemplateFile(resolve(file)));
  console.log('[env:validate] Template contract check OK');
  process.exit(0);
}

const config = TARGETS[target];
if (!config) {
  fail(`Unknown target "${target}". Expected one of: ${Object.keys(TARGETS).join(', ')}`);
}

const requiredVars = [
  ...config.required,
  ...(config.requiredByMode[mode] || []),
];

for (const key of requiredVars) {
  requireValue(key);
}

for (const key of config.optionalBoolean) {
  validateBoolean(key, process.env[key]);
}

for (const key of config.obsolete) {
  if (process.env[key]) {
    fail(`${key} is obsolete for ${target}; use JWT_ACCESS_SECRET/JWT_REFRESH_SECRET and explicit expirations instead`);
  }
}

validateUrl('DATABASE_URL', process.env.DATABASE_URL);
validateUrl('REDIS_URL', process.env.REDIS_URL);
validateUrl('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL);
validateUrl('NEXT_PUBLIC_WEBSOCKET_URL', process.env.NEXT_PUBLIC_WEBSOCKET_URL);
validateUrl('API_BASE_URL', process.env.API_BASE_URL);
validateUrl('PAYMENT_REDIRECT_BASE_URL', process.env.PAYMENT_REDIRECT_BASE_URL);
validateDuration('JWT_ACCESS_EXPIRES_IN', process.env.JWT_ACCESS_EXPIRES_IN);
validateDuration('JWT_REFRESH_EXPIRES_IN', process.env.JWT_REFRESH_EXPIRES_IN);

console.log(`[env:validate] OK for target=${target} mode=${mode}`);
