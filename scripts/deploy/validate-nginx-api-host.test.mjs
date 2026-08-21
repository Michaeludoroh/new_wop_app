import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const confDir = join(dirname(fileURLToPath(import.meta.url)), '../../infra/nginx/conf.d');

function readConf(name) {
  return readFileSync(join(confDir, name), 'utf8');
}

test('api.woppandmopp.com proxies /api/ to the Nest API upstream, not the website', () => {
  const api = readConf('api.server.conf');

  assert.match(api, /server_name\s+api\.woppandmopp\.com;/);
  assert.match(api, /listen\s+443\s+ssl/);
  assert.match(api, /location\s+\/api\//);
  assert.match(api, /proxy_pass\s+http:\/\/\$ministry_api_upstream;/);

  assert.doesNotMatch(
    api,
    /return\s+301\s+https:\/\/woppandmopp\.com\$request_uri;/,
    'api.woppandmopp.com must not 301 to the apex website',
  );
  assert.doesNotMatch(api, /\$ministry_admin_upstream/);
  assert.doesNotMatch(api, /172\.18\.0\.1:8000/);

  const apiLocation = api.split(/location\s+\/api\s*\//)[1] ?? '';
  assert.match(apiLocation, /proxy_set_header\s+Host\s+\$host;/);
  assert.match(apiLocation, /proxy_set_header\s+X-Real-IP\s+\$remote_addr;/);
  assert.match(apiLocation, /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/);
  assert.match(apiLocation, /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/);
  assert.match(apiLocation, /proxy_set_header\s+Authorization\s+\$http_authorization;/);
  assert.match(apiLocation, /proxy_set_header\s+X-Correlation-Id\s+\$http_x_correlation_id;/);
});

test('HTTP api.woppandmopp.com upgrades to HTTPS on the same host', () => {
  const api = readConf('api.server.conf');
  assert.match(api, /return\s+301\s+https:\/\/\$host\$request_uri;/);
});

test('apex and admin hosts keep their existing upstreams', () => {
  const apex = readConf('woppandmopp.server.conf');
  const admin = readConf('admin.server.conf');
  const websocket = readConf('websocket.server.conf');
  const backends = readConf('backends.conf');

  assert.match(apex, /server_name\s+woppandmopp\.com/);
  assert.match(apex, /proxy_pass\s+http:\/\/172\.18\.0\.1:8000;/);
  assert.match(apex, /location\s+\/api\//);
  assert.match(apex, /proxy_pass\s+http:\/\/\$ministry_api_upstream;/);
  assert.match(apex, /location\s+\/socket\.io/);
  assert.match(apex, /proxy_pass\s+http:\/\/\$ministry_websocket_upstream;/);

  assert.match(admin, /server_name\s+admin\.woppandmopp\.com;/);
  assert.match(admin, /proxy_pass\s+http:\/\/\$ministry_admin_upstream;/);

  assert.match(websocket, /server_name\s+ws\.woppandmopp\.com;/);
  assert.match(backends, /default\s+api:4000;/);
  assert.match(backends, /default\s+websocket:4100;/);
  assert.match(backends, /default\s+admin-web:3001;/);
});
