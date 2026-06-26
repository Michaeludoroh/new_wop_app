#!/usr/bin/env node
/**
 * Boots production compose stack locally and validates health endpoints.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const composeFile = process.env.COMPOSE_FILE || 'docker-compose.prod.yml';

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env, IMAGE_TAG: 'local-test' },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

async function waitForHealth(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[validate-stack] OK ${url}`);
        return;
      }
    } catch {
      // retry
    }
    sleep(5000);
  }
  throw new Error(`Health check timed out: ${url}`);
}

async function main() {
  run('node', ['scripts/deploy/prepare-test-production-env.mjs']);

  run('docker', ['compose', '-f', composeFile, 'config']);
  run('docker', ['compose', '-f', composeFile, 'build']);
  run('docker', ['compose', '-f', composeFile, 'up', '-d', '--remove-orphans']);

  await waitForHealth('http://127.0.0.1:8080/health/nginx');
  await waitForHealth('http://127.0.0.1:8080/api/v1/health');

  console.log('[validate-stack] Production stack validation PASSED');
  console.log('[validate-stack] Run: docker compose -f docker-compose.prod.yml down');
}

main().catch((error) => {
  console.error(`[validate-stack] FAILED: ${error.message}`);
  process.exit(1);
});
