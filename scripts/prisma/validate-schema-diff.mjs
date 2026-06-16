#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const apiDir = resolve('services/api');
const schemaPath = resolve(apiDir, 'prisma/schema.prisma');

function run(command, args, cwd = apiDir) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`[prisma:validate] Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[prisma:validate] Missing DATABASE_URL');
  }

  console.log('[prisma:validate] Deploying migrations to validation database...');
  run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('[prisma:validate] Generating Prisma client...');
  run('npx', ['prisma', 'generate']);

  console.log('[prisma:validate] Verifying deployed database matches schema.prisma...');
  run('npx', [
    'prisma',
    'migrate',
    'diff',
    '--from-url',
    process.env.DATABASE_URL,
    '--to-schema-datamodel',
    schemaPath,
    '--exit-code',
  ]);

  console.log('[prisma:validate] Migration/schema consistency check OK');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
