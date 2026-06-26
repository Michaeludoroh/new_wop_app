#!/usr/bin/env node
/**
 * Restore PostgreSQL from a plain SQL or .sql.gz backup file.
 *
 * Usage:
 *   node scripts/backup/restore-postgres.mjs --file=infra/postgres/backups/postgres-YYYY.sql.gz
 *
 * WARNING: Destructive — drops and recreates public schema objects. Review backup first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function runShell(command) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`Restore command failed: ${command}`);
  }
}

function main() {
  const file = getArg('file');
  if (!file || !existsSync(resolve(repoRoot, file))) {
    throw new Error('Provide --file=path/to/backup.sql or .sql.gz');
  }

  const pgUser = process.env.POSTGRES_USER || 'ministry';
  const pgDb = process.env.POSTGRES_DB || 'ministry_platform';
  const absFile = resolve(repoRoot, file);

  console.log('[restore-postgres] STOP api and websocket before restore.');
  console.log(`[restore-postgres] Restoring ${absFile} into ${pgDb}...`);

  if (absFile.endsWith('.gz')) {
    runShell(
      `gunzip -c "${absFile}" | docker compose -f ${composeFile} exec -T postgres psql -U ${pgUser} -d ${pgDb}`,
    );
  } else {
    runShell(
      `docker compose -f ${composeFile} exec -T postgres psql -U ${pgUser} -d ${pgDb} < "${absFile}"`,
    );
  }

  console.log('[restore-postgres] Restore SQL applied. Run prisma migrate status to verify.');
}

try {
  main();
} catch (error) {
  console.error(`[restore-postgres] ${error.message}`);
  process.exit(1);
}
