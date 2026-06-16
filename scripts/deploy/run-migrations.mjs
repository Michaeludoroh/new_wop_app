#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`[run-migrations] Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[run-migrations] Missing DATABASE_URL');
  }

  console.log('[run-migrations] Running Prisma deploy migrations...');
  run('npx', ['prisma', 'migrate', 'deploy'], 'services/api');
  console.log('[run-migrations] Verifying deployed schema matches Prisma datamodel...');
  run(
    'npx',
    [
      'prisma',
      'migrate',
      'diff',
      '--from-url',
      process.env.DATABASE_URL,
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--exit-code',
    ],
    'services/api',
  );
  console.log('[run-migrations] Migration deploy and schema verification completed.');
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
