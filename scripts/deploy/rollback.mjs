#!/usr/bin/env node
/**
 * Rollback to previous release (API + Admin containers).
 * Database rollback is NOT automated — see ROLLBACK_RUNBOOK.md.
 *
 * Env:
 *   DEPLOY_ENV       production | staging
 *   ROLLBACK_TAG     optional explicit image tag (default: previous release from state)
 *   COMPOSE_FILE     default docker-compose.prod.yml
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getCurrentRelease, getPreviousRelease } from './release-state.mjs';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';
const deployEnv = process.env.DEPLOY_ENV || 'production';

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  const current = getCurrentRelease();
  const previous = getPreviousRelease();
  const rollbackTag = process.env.ROLLBACK_TAG || previous?.imageTag;

  console.log(`[rollback] Environment: ${deployEnv}`);
  console.log(`[rollback] Current release: ${current?.imageTag ?? 'unknown'}`);

  if (!rollbackTag) {
    throw new Error(
      'No previous release found in .deploy/release-state.json. Set ROLLBACK_TAG explicitly.',
    );
  }

  console.log(`[rollback] Rolling back to tag: ${rollbackTag}`);

  run('docker', ['compose', '-f', composeFile, 'up', '-d', '--no-build', 'api', 'websocket', 'admin-web'], {
    IMAGE_TAG: rollbackTag,
  });

  if (process.env.API_HEALTH_URL) {
    run('node', ['scripts/deploy/verify-health.mjs']);
  }

  console.log('[rollback] Application rollback complete');
  console.log('[rollback] DATABASE: Prisma migrations are forward-only. See ROLLBACK_RUNBOOK.md for DB guidance.');
}

try {
  main();
} catch (error) {
  console.error(`[rollback] FAILED: ${error.message}`);
  process.exit(1);
}
