#!/usr/bin/env node
/**
 * Runs prisma migrate deploy + seed against DATABASE_URL in services/api/.env
 * Usage: node scripts/beta/setup-staging-db.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const apiDir = resolve(root, 'services/api');
const envPath = resolve(apiDir, '.env');

if (!existsSync(envPath)) {
  console.error('[setup-staging-db] Missing services/api/.env');
  process.exit(1);
}

function run(label, command, args) {
  console.log(`[setup-staging-db] ${label}...`);
  const result = spawnSync(command, args, {
    cwd: apiDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`[setup-staging-db] ${label} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

run('migrate deploy', 'npx', ['prisma', 'migrate', 'deploy']);
run('seed', 'npx', ['prisma', 'db', 'seed']);

console.log('[setup-staging-db] Database migrate + seed completed.');
