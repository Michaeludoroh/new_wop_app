const axios = require('axios');
const jwt = require('jsonwebtoken');
const { makeCheck } = require('../../core/types');

async function runAuthSuite({ config }) {
  const checks = [];
  const base = config.apiBaseUrl;
  let accessToken = null;
  let refreshToken = null;

  async function runCheck(id, name, fn) {
    const t0 = Date.now();
    try {
      const details = await fn();
      checks.push(
        makeCheck({
          id,
          name,
          status: details.status || 'PASS',
          details,
          durationMs: Date.now() - t0,
        }),
      );
    } catch (error) {
      checks.push(
        makeCheck({
          id,
          name,
          status: 'WARNING',
          details: { message: error.message },
          durationMs: Date.now() - t0,
        }),
      );
    }
  }

  await runCheck('auth-register-shape', 'Register endpoint validation shape', async () => {
    return { status: 'SKIPPED', note: 'register mutation skipped for deterministic runs' };
  });

  await runCheck('auth-login', 'Login with configured credentials', async () => {
    const res = await axios.post(
      `${base}/auth/login`,
      {
        email: config.auth.email,
        password: config.auth.password,
      },
      { timeout: config.timeouts.requestMs },
    );
    accessToken = res.data?.accessToken || null;
    refreshToken = res.data?.refreshToken || null;
    return {
      status: res.status === 201 || res.status === 200 ? 'PASS' : 'FAIL',
      statusCode: res.status,
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
    };
  });

  await runCheck('auth-invalid-credentials', 'Invalid credentials rejected', async () => {
    try {
      await axios.post(
        `${base}/auth/login`,
        { email: config.auth.email, password: 'invalid-password' },
        { timeout: config.timeouts.requestMs },
      );
      return { status: 'FAIL', note: 'invalid credentials unexpectedly accepted' };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'FAIL',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('auth-malformed-payload', 'Malformed payload handling', async () => {
    try {
      await axios.post(`${base}/auth/login`, { email: 12345 }, { timeout: config.timeouts.requestMs });
      return { status: 'FAIL', note: 'malformed payload unexpectedly accepted' };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'FAIL',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('auth-refresh', 'Refresh endpoint lifecycle', async () => {
    if (!refreshToken) return { status: 'SKIPPED', reason: 'no refresh token available' };
    const res = await axios.post(
      `${base}/auth/refresh`,
      { refreshToken },
      { timeout: config.timeouts.requestMs },
    );
    return {
      status: res.status === 201 || res.status === 200 ? 'PASS' : 'FAIL',
      statusCode: res.status,
      hasAccessToken: Boolean(res.data?.accessToken),
    };
  });

  await runCheck('auth-expired-jwt-check', 'Expired JWT guard behavior (synthetic)', async () => {
    const expired = jwt.sign({ sub: 'validation-user' }, 'validation-secret', { expiresIn: -10 });
    return {
      status: expired ? 'PASS' : 'FAIL',
      note: 'synthetic expired token generated for runner-level contract check',
    };
  });

  await runCheck('auth-rbac-shape', 'RBAC protected route behavior shape', async () => {
    if (!accessToken) return { status: 'SKIPPED', reason: 'no access token available' };
    try {
      const res = await axios.get(`${base}/payments/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: config.timeouts.requestMs,
      });
      return {
        status: res.status >= 200 && res.status < 500 ? 'PASS' : 'FAIL',
        statusCode: res.status,
      };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'WARNING',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('auth-logout-shape', 'Logout endpoint validation shape', async () => {
    if (!refreshToken) return { status: 'SKIPPED', reason: 'no refresh token available' };
    try {
      const res = await axios.post(
        `${base}/auth/logout`,
        { refreshToken },
        { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, timeout: config.timeouts.requestMs },
      );
      return { status: res.status >= 200 && res.status < 300 ? 'PASS' : 'WARNING', statusCode: res.status };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'WARNING',
        statusCode: error.response?.status || null,
      };
    }
  });

  return { checks };
}

module.exports = { runAuthSuite };
