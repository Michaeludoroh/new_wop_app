#!/usr/bin/env node
/**
 * Verifies four published policy types exist in the database.
 * Usage: node scripts/beta/verify-policy-seed.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const apiDir = resolve(root, 'services/api');
const envPath = resolve(apiDir, '.env');

if (!existsSync(envPath)) {
  console.error('[verify-policy-seed] Missing services/api/.env');
  process.exit(1);
}

const result = spawnSync('npx', ['ts-node', './src/scripts/verify-policy-seed.ts'], {
  cwd: apiDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
