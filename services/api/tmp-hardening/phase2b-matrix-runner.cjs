const fs = require('fs');
const cp = require('child_process');

const BASE = 'http://localhost:3000/api/v1';
const RESULT_PATH = 'tmp-hardening/phase2b-matrix-results.json';

function sh(cmd) {
  try {
    return cp.execSync(cmd, { encoding: 'utf8' });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function parseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function curl(method, path, token, body) {
  const headers = ['-H "Content-Type: application/json"'];
  if (token) headers.push(`-H "Authorization: Bearer ${token}"`);
  const data = body ? ` --data '${JSON.stringify(body)}'` : '';
  const cmd = `curl.exe -s -w "\\nHTTP_STATUS:%{http_code}" -X ${method} ${headers.join(' ')} ${BASE}${path}${data}`;
  const out = sh(cmd);
  const m = out.match(/HTTP_STATUS:(\d+)/);
  const status = m ? Number(m[1]) : 0;
  const resp = out.replace(/\nHTTP_STATUS:\d+\s*$/, '').trim();
  return { status, resp, json: parseJson(resp) };
}

function login(file) {
  const cmd = `curl.exe -s -X POST -H "Content-Type: application/json" --data-binary @${file} ${BASE}/auth/login`;
  const out = sh(cmd);
  const j = parseJson(out) || {};
  return j.accessToken || null;
}

function psql(query) {
  const esc = query.replace(/"/g, '\\"');
  const cmd = `docker exec ministry_postgres_dev psql -U postgres -d app_db -t -A -c "${esc}"`;
  return sh(cmd).trim();
}

function pushResult(list, name, response, expected = []) {
  list.push({
    name,
    status: response.status,
    response: (response.resp || '').slice(0, 500),
    expected
  });
}

function evaluateReadiness(endpointMatrix, securityMatrix, dbVerification) {
  const failures = [];
  const allRows = [...endpointMatrix, ...securityMatrix];
  for (const row of allRows) {
    if (Array.isArray(row.expected) && row.expected.length > 0) {
      const ok = row.expected.includes(row.status);
      if (!ok) failures.push({ type: 'http', name: row.name, status: row.status, expected: row.expected });
    }
  }

  for (const check of dbVerification.checks) {
    if (!check.pass) failures.push({ type: 'db', name: check.name, detail: check.detail });
  }

  const totalChecks = allRows.filter(r => r.expected?.length).length + dbVerification.checks.length;
  const failedChecks = failures.length;
  const passedChecks = Math.max(0, totalChecks - failedChecks);
  const readinessScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  let classification = 'PASS';
  if (failedChecks > 0) classification = 'FAIL';

  return { readinessScore, classification, failures };
}

function main() {
  const tokens = {
    superAdmin: login('tmp-login-superadmin.json'),
    admin: login('tmp-login-test.json'),
    user: login('tmp-login-live.json')
  };

  const authBootstrap = {
    superAdmin: !!tokens.superAdmin,
    admin: !!tokens.admin,
    user: !!tokens.user
  };

  const endpointMatrix = [];
  const securityMatrix = [];
  const defects = [];

  // Endpoint matrix
  const rAnonymousMyDevices = curl('GET', '/push/my-devices');
  pushResult(endpointMatrix, 'my-devices unauthorized', rAnonymousMyDevices, [401, 403]);

  const rUserMyDevices = curl('GET', '/push/my-devices', tokens.user);
  pushResult(endpointMatrix, 'my-devices success (user)', rUserMyDevices, [200]);

  const rRegisterUnauthorized = curl('POST', '/push/device-token/register', null, { token: 'tok-anon', platform: 'ANDROID' });
  pushResult(endpointMatrix, 'register unauthorized', rRegisterUnauthorized, [401, 403]);

  const rRegisterSuccess = curl('POST', '/push/device-token/register', tokens.user, { token: 'tok-user-a', platform: 'ANDROID', deviceId: 'dev-u-1' });
  pushResult(endpointMatrix, 'register success', rRegisterSuccess, [200, 201]);

  const rRegisterDuplicate = curl('POST', '/push/device-token/register', tokens.user, { token: 'tok-user-a', platform: 'ANDROID', deviceId: 'dev-u-1' });
  pushResult(endpointMatrix, 'register duplicate', rRegisterDuplicate, [200, 201, 409]);

  const rRegisterInvalid = curl('POST', '/push/device-token/register', tokens.user, { platform: 'ANDROID' });
  pushResult(endpointMatrix, 'register invalid payload', rRegisterInvalid, [400, 422]);

  const rRefreshUnauthorized = curl('POST', '/push/device-token/refresh', null, { oldToken: 'tok-user-a', newToken: 'tok-user-b', platform: 'ANDROID' });
  pushResult(endpointMatrix, 'refresh unauthorized', rRefreshUnauthorized, [401, 403]);

  const rRefreshSuccess = curl('POST', '/push/device-token/refresh', tokens.user, { oldToken: 'tok-user-a', newToken: 'tok-user-b', platform: 'ANDROID', deviceId: 'dev-u-1' });
  pushResult(endpointMatrix, 'refresh success', rRefreshSuccess, [200]);

  const rRefreshInvalid = curl('POST', '/push/device-token/refresh', tokens.user, { oldToken: 'tok-missing', newToken: 'tok-user-c', platform: 'ANDROID' });
  pushResult(endpointMatrix, 'refresh invalid token', rRefreshInvalid, [400, 404, 409]);

  const rRevokeUnauthorized = curl('POST', '/push/device-token/revoke', null, { token: 'tok-user-b' });
  pushResult(endpointMatrix, 'revoke unauthorized', rRevokeUnauthorized, [401, 403]);

  const rRevokeSuccess = curl('POST', '/push/device-token/revoke', tokens.user, { token: 'tok-user-b' });
  pushResult(endpointMatrix, 'revoke success', rRevokeSuccess, [200]);

  const rRevokeAlready = curl('POST', '/push/device-token/revoke', tokens.user, { token: 'tok-user-b' });
  pushResult(endpointMatrix, 'revoke already revoked', rRevokeAlready, [200, 400, 404, 409]);

  const rReregister = curl('POST', '/push/device-token/register', tokens.user, { token: 'tok-user-b', platform: 'ANDROID', deviceId: 'dev-u-1' });
  pushResult(endpointMatrix, 're-register after revoke', rReregister, [200, 201]);

  const rAdminRegister = curl('POST', '/push/device-token/register', tokens.admin, { token: 'tok-admin-a', platform: 'WEB', deviceId: 'dev-a-1' });
  pushResult(endpointMatrix, 'admin register own token', rAdminRegister, [200, 201]);

  const rSuperRegister = curl('POST', '/push/device-token/register', tokens.superAdmin, { token: 'tok-super-a', platform: 'IOS', deviceId: 'dev-s-1' });
  pushResult(endpointMatrix, 'super_admin register own token', rSuperRegister, [200, 201]);

  const rOwnershipRefresh = curl('POST', '/push/device-token/refresh', tokens.user, { oldToken: 'tok-admin-a', newToken: 'tok-admin-b', platform: 'WEB' });
  pushResult(endpointMatrix, 'refresh ownership violation', rOwnershipRefresh, [403, 404]);

  const rOwnershipRevoke = curl('POST', '/push/device-token/revoke', tokens.user, { token: 'tok-admin-a' });
  pushResult(endpointMatrix, 'revoke ownership violation', rOwnershipRevoke, [403, 404]);

  // Security matrix
  pushResult(securityMatrix, 'anonymous my-devices blocked (JWT enforcement)', rAnonymousMyDevices, [401, 403]);
  pushResult(securityMatrix, 'USER my-devices allowed', rUserMyDevices, [200]);

  const rAdminMyDevices = curl('GET', '/push/my-devices', tokens.admin);
  pushResult(securityMatrix, 'ADMIN my-devices allowed', rAdminMyDevices, [200]);

  const rSuperMyDevices = curl('GET', '/push/my-devices', tokens.superAdmin);
  pushResult(securityMatrix, 'SUPER_ADMIN my-devices allowed', rSuperMyDevices, [200]);

  pushResult(securityMatrix, 'USER cannot refresh ADMIN token (ownership)', rOwnershipRefresh, [403, 404]);
  pushResult(securityMatrix, 'USER cannot revoke ADMIN token (ownership)', rOwnershipRevoke, [403, 404]);

  // DB verification
  const dbVerification = { checks: [] };

  const userCount = psql(`select count(*) from "PushDeviceToken" where "userId"=(select id from "User" where email='phase2k-user@wop.local') and token in ('tok-user-a','tok-user-b');`);
  dbVerification.checks.push({
    name: 'duplicate prevention (user token count <= 2)',
    pass: Number(userCount || 0) <= 2 && Number(userCount || 0) >= 1,
    detail: { userCount }
  });

  const userRows = psql(`select token,("revokedAt" is null) as active,"deviceId","userId" from "PushDeviceToken" where "userId"=(select id from "User" where email='phase2k-user@wop.local') and token in ('tok-user-a','tok-user-b') order by token;`);
  dbVerification.checks.push({
    name: 'user linkage + register/reactivation evidence',
    pass: !!userRows && !/ERROR:/i.test(userRows),
    detail: { userRows }
  });

  const adminRows = psql(`select token,"userId","revokedAt" from "PushDeviceToken" where token in ('tok-admin-a','tok-admin-b') order by token;`);
  dbVerification.checks.push({
    name: 'ownership preserved for admin token',
    pass: !!adminRows && /tok-admin-a/.test(adminRows) && !/tok-admin-b/.test(adminRows),
    detail: { adminRows }
  });

  const superRows = psql(`select token,"userId","revokedAt" from "PushDeviceToken" where token='tok-super-a';`);
  dbVerification.checks.push({
    name: 'super admin token created',
    pass: !!superRows && /tok-super-a/.test(superRows),
    detail: { superRows }
  });

  const revokeState = psql(`select token,("revokedAt" is not null) as revoked from "PushDeviceToken" where token='tok-user-b';`);
  dbVerification.checks.push({
    name: 'revoke/reactivation transition observable',
    pass: !!revokeState && !/ERROR:/i.test(revokeState),
    detail: { revokeState }
  });

  // Defect extraction
  const allRows = [...endpointMatrix, ...securityMatrix];
  for (const row of allRows) {
    if (Array.isArray(row.expected) && row.expected.length > 0 && !row.expected.includes(row.status)) {
      defects.push({
        type: 'endpoint_or_security',
        name: row.name,
        expected: row.expected,
        actualStatus: row.status,
        response: row.response
      });
    }
  }
  for (const check of dbVerification.checks) {
    if (!check.pass) {
      defects.push({
        type: 'db',
        name: check.name,
        detail: check.detail
      });
    }
  }

  const readiness = evaluateReadiness(endpointMatrix, securityMatrix, dbVerification);

  const output = {
    meta: {
      phase: '2B',
      generatedAt: new Date().toISOString(),
      baseUrl: BASE
    },
    authBootstrap,
    endpointMatrix,
    securityMatrix,
    dbVerification,
    defects,
    readiness
  };

  fs.writeFileSync(RESULT_PATH, JSON.stringify(output, null, 2));
  console.log('phase2b_matrix_done');
}

main();
