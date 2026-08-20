import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEYS,
  PRODUCTION_PUBLIC_URL_DEFAULTS,
  PRODUCTION_MEDIA_AND_BILLING_DEFAULTS,
  buildEnvLines,
  materializeProductionEnv,
} from './materialize-production-env.mjs';

test('materialize KEYS preserve both production web origins', () => {
  assert.ok(KEYS.includes('WEB_APP_URL'));
  assert.ok(KEYS.includes('USER_WEB_APP_URL'));
});

test('public URL defaults match the production architecture and are not secrets', () => {
  assert.equal(
    PRODUCTION_PUBLIC_URL_DEFAULTS.WEB_APP_URL,
    'https://admin.woppandmopp.com',
  );
  assert.equal(
    PRODUCTION_PUBLIC_URL_DEFAULTS.USER_WEB_APP_URL,
    'https://woppandmopp.com',
  );
  assert.equal(Object.hasOwn(PRODUCTION_PUBLIC_URL_DEFAULTS, 'SMTP_PASSWORD'), false);
  assert.equal(Object.hasOwn(PRODUCTION_PUBLIC_URL_DEFAULTS, 'JWT_ACCESS_SECRET'), false);
});

test('buildEnvLines fills missing WEB_APP_URL and USER_WEB_APP_URL', () => {
  const lines = buildEnvLines({ NODE_ENV: 'production' });
  assert.ok(lines.includes('WEB_APP_URL=https://admin.woppandmopp.com'));
  assert.ok(lines.includes('USER_WEB_APP_URL=https://woppandmopp.com'));
  assert.ok(lines.includes('MEDIA_ROOT=/app/uploads'));
  assert.ok(lines.includes('MOBILE_IOS_PREMIUM_PRODUCT_ID=wopp_premium_monthly'));
  assert.equal(PRODUCTION_MEDIA_AND_BILLING_DEFAULTS.MEDIA_ROOT, '/app/uploads');
});

test('buildEnvLines keeps explicit env values and does not invent secrets', () => {
  const lines = buildEnvLines({
    NODE_ENV: 'production',
    WEB_APP_URL: 'https://admin.woppandmopp.com',
    USER_WEB_APP_URL: 'https://woppandmopp.com',
    SMTP_PASSWORD: 'from-ci',
  });
  assert.ok(lines.includes('WEB_APP_URL=https://admin.woppandmopp.com'));
  assert.ok(lines.includes('USER_WEB_APP_URL=https://woppandmopp.com'));
  assert.ok(lines.includes('SMTP_PASSWORD=from-ci'));
  assert.equal(lines.filter((line) => line.startsWith('JWT_ACCESS_SECRET=')).length, 0);
});

test('skips existing .env.production unless FORCE_MATERIALIZE=1', () => {
  const writes = [];
  const skipped = materializeProductionEnv({
    target: '/tmp/.env.production',
    env: { USER_WEB_APP_URL: 'https://woppandmopp.com' },
    force: '0',
    exists: () => true,
    write: (path, contents) => writes.push({ path, contents }),
  });
  assert.equal(skipped.skipped, true);
  assert.equal(writes.length, 0);

  const written = materializeProductionEnv({
    target: '/tmp/.env.production',
    env: {},
    force: '1',
    exists: () => true,
    write: (path, contents) => writes.push({ path, contents }),
  });
  assert.equal(written.skipped, false);
  assert.match(writes[0].contents, /USER_WEB_APP_URL=https:\/\/woppandmopp\.com/);
  assert.match(writes[0].contents, /WEB_APP_URL=https:\/\/admin\.woppandmopp\.com/);
});
