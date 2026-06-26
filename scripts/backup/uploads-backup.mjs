#!/usr/bin/env node
/**
 * Archives API uploads volume (clips, ebooks, announcements) from running api container.
 *
 * Env:
 *   COMPOSE_FILE   default docker-compose.prod.yml
 *   BACKUP_DIR     default infra/postgres/backups
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';
const backupDir = resolve(repoRoot, process.env.BACKUP_DIR || 'infra/postgres/backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = resolve(backupDir, `uploads-${timestamp}.tar.gz`);

function main() {
  mkdirSync(backupDir, { recursive: true });

  const cmd =
    process.platform === 'win32'
      ? `docker compose -f ${composeFile} exec -T api tar -czf - -C /app uploads`
      : `docker compose -f ${composeFile} exec -T api tar -czf - -C /app uploads > "${outputFile}"`;

  const result = spawnSync(cmd, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error('Uploads backup failed — is the api container running?');
  }

  if (process.platform !== 'win32') {
    console.log(`[uploads-backup] Wrote ${outputFile}`);
  } else {
    console.log('[uploads-backup] Redirect output to file on Windows: ... > uploads-backup.tar.gz');
  }
}

try {
  main();
} catch (error) {
  console.error(`[uploads-backup] ${error.message}`);
  process.exit(1);
}
