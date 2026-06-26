#!/usr/bin/env node
/**
 * PostgreSQL backup via docker compose exec or direct pg_dump.
 *
 * Env:
 *   COMPOSE_FILE          default docker-compose.prod.yml
 *   POSTGRES_SERVICE      default postgres
 *   BACKUP_DIR            default infra/postgres/backups
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';
const backupDir = resolve(repoRoot, process.env.BACKUP_DIR || 'infra/postgres/backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = resolve(backupDir, `postgres-${timestamp}.sql.gz`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Backup command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  mkdirSync(backupDir, { recursive: true });

  const pgUser = process.env.POSTGRES_USER || 'ministry';
  const pgDb = process.env.POSTGRES_DB || 'ministry_platform';

  if (process.env.DATABASE_URL && !process.env.USE_COMPOSE) {
    run('pg_dump', [process.env.DATABASE_URL, '--no-owner', '--format=plain']);
    console.log('[postgres-backup] Use: pg_dump "$DATABASE_URL" | gzip > file.sql.gz');
    return;
  }

  run('docker', [
    'compose',
    '-f',
    composeFile,
    'exec',
    '-T',
    'postgres',
    'pg_dump',
    '-U',
    pgUser,
    pgDb,
  ]);

  // Re-run with gzip via shell for cross-platform simplicity
  const dumpCmd =
    process.platform === 'win32'
      ? `docker compose -f ${composeFile} exec -T postgres pg_dump -U ${pgUser} ${pgDb}`
      : `docker compose -f ${composeFile} exec -T postgres pg_dump -U ${pgUser} ${pgDb} | gzip > "${outputFile}"`;

  if (process.platform !== 'win32') {
    const result = spawnSync(dumpCmd, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
    });
    if (result.status !== 0) {
      throw new Error('pg_dump via compose failed');
    }
    console.log(`[postgres-backup] Wrote ${outputFile}`);
    return;
  }

  console.log(`[postgres-backup] On Windows, run manually:\n  ${dumpCmd} > backup.sql`);
  console.log(`[postgres-backup] Target directory: ${backupDir}`);
}

try {
  main();
} catch (error) {
  console.error(`[postgres-backup] ${error.message}`);
  process.exit(1);
}
