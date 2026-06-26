#!/usr/bin/env node
/**
 * Validates backup artifacts exist and are non-empty.
 *
 * Usage:
 *   node scripts/backup/validate-restore.mjs --postgres=infra/postgres/backups/latest.sql.gz
 */
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function assertBackup(label, filePath) {
  if (!filePath) {
    console.log(`[validate-restore] Skipped ${label} (not provided)`);
    return;
  }
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    throw new Error(`${label} backup not found: ${abs}`);
  }
  const size = statSync(abs).size;
  if (size < 100) {
    throw new Error(`${label} backup suspiciously small (${size} bytes): ${abs}`);
  }
  console.log(`[validate-restore] ${label} OK (${size} bytes): ${abs}`);
}

function main() {
  assertBackup('postgres', getArg('postgres'));
  assertBackup('uploads', getArg('uploads'));
  console.log('[validate-restore] Backup validation PASSED');
}

try {
  main();
} catch (error) {
  console.error(`[validate-restore] ${error.message}`);
  process.exit(1);
}
