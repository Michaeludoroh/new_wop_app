#!/usr/bin/env node
/**
 * Production deployment orchestrator (Docker Compose).
 *
 * Steps: validate secrets → migrations → build → up → health check → save release state
 *
 * Env:
 *   DEPLOY_ENV          production | staging
 *   IMAGE_TAG           docker image tag (default: git sha or timestamp)
 *   COMPOSE_FILE        default docker-compose.prod.yml
 *   SKIP_COMPOSE_UP     set to 1 to run migrate/build only (CI prepare mode)
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { saveRelease } from './release-state.mjs';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';
const deployEnv = process.env.DEPLOY_ENV || 'production';
const imageTag = process.env.IMAGE_TAG || `deploy-${Date.now()}`;

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

function requireFile(path) {
  if (!existsSync(resolve(repoRoot, path))) {
    throw new Error(`Required file missing: ${path}`);
  }
}

function main() {
  console.log(`[deploy] Starting ${deployEnv} deployment (tag=${imageTag})`);

  run('node', ['scripts/deploy/materialize-production-env.mjs'], {
    DEPLOY_ENV: deployEnv,
    IMAGE_TAG: imageTag,
    FORCE_MATERIALIZE: process.env.FORCE_MATERIALIZE || '0',
  });

  requireFile('.env.production');
  requireFile(composeFile);
  requireFile('infra/nginx/nginx.conf');

  run('node', ['scripts/env/validate-production-secrets.mjs', `--mode=${deployEnv}`]);
  run('node', ['scripts/env/validate-env.mjs', '--target=api'], {
    NODE_ENV: deployEnv,
  });

  // Migrations via compose one-shot service (also runs on up, but explicit for CI visibility)
  run('docker', ['compose', '-f', composeFile, 'build', 'migrate', 'api', 'websocket', 'admin-web'], {
    IMAGE_TAG: imageTag,
  });

  if (process.env.SKIP_MIGRATE_COMPOSE !== '1') {
    run('docker', ['compose', '-f', composeFile, 'run', '--rm', 'migrate'], {
      IMAGE_TAG: imageTag,
    });
  } else {
    console.log('[deploy] SKIP_MIGRATE_COMPOSE=1 — migrations handled externally');
  }

  run('docker', ['compose', '-f', composeFile, 'build', 'api', 'websocket', 'admin-web'], {
    IMAGE_TAG: imageTag,
  });

  if (process.env.SKIP_COMPOSE_UP === '1') {
    console.log('[deploy] SKIP_COMPOSE_UP=1 — skipping docker compose up');
  } else {
    run('docker', ['compose', '-f', composeFile, 'up', '-d', '--remove-orphans'], {
      IMAGE_TAG: imageTag,
    });
  }

  if (process.env.API_HEALTH_URL) {
    run('node', ['scripts/deploy/verify-health.mjs']);
  } else {
    console.log('[deploy] Set API_HEALTH_URL/WS_HEALTH_URL/ADMIN_HEALTH_URL to run post-deploy health checks');
  }

  saveRelease({
    id: randomBytes(8).toString('hex'),
    environment: deployEnv,
    imageTag,
    timestamp: new Date().toISOString(),
    composeFile,
  });

  console.log('[deploy] Deployment completed successfully');
}

try {
  main();
} catch (error) {
  console.error(`[deploy] FAILED: ${error.message}`);
  process.exit(1);
}
