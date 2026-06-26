#!/usr/bin/env node
/**
 * Generates .env.production for local compose stack validation (NOT for real production).
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function secret(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

const pgUser = 'ministry';
const pgPass = secret(16);
const pgDb = 'ministry_platform';

const content = `# AUTO-GENERATED for compose stack validation — ${new Date().toISOString()}
NODE_ENV=production

POSTGRES_USER=${pgUser}
POSTGRES_PASSWORD=${pgPass}
POSTGRES_DB=${pgDb}
DATABASE_URL=postgresql://${pgUser}:${pgPass}@postgres:5432/${pgDb}?schema=public

REDIS_URL=redis://redis:6379
REDIS_ADAPTER_ENABLED=true

PORT=4000
JWT_ACCESS_SECRET=${secret(32)}
JWT_REFRESH_SECRET=${secret(32)}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_LIMIT=100
CORS_ORIGIN=http://admin.localhost
METRICS_AUTH_TOKEN=${secret(16)}

CONTENT_ACCESS_SECRET=${secret(32)}
API_PUBLIC_URL=http://api.localhost

WEBSOCKET_PORT=4100
WEBSOCKET_ONLY_MODE=false
NEXT_PUBLIC_WEBSOCKET_URL=http://ws.localhost
NEXT_PUBLIC_API_BASE_URL=http://api.localhost/api/v1

SMTP_FROM=noreply@test.local
PAYMENT_REDIRECT_BASE_URL=http://api.localhost/api/v1
IMAGE_TAG=local-test
`;

writeFileSync(resolve('.env.production'), content);
console.log('[prepare-test-env] Wrote .env.production for local stack validation');
