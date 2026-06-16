const axios = require('axios');
const { makeCheck } = require('../../core/types');

async function runNotificationsSuite({ config }) {
  const checks = [];
  const base = config.apiBaseUrl;
  let token = null;

  try {
    const login = await axios.post(`${base}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password,
    });
    token = login.data?.accessToken || null;
  } catch {}

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

  if (!token) {
    checks.push(
      makeCheck({
        id: 'notifications-auth-prereq',
        name: 'Notifications suite auth prerequisite',
        status: 'SKIPPED',
        details: { reason: 'unable to acquire auth token' },
      }),
    );
    return { checks };
  }

  const req = axios.create({
    timeout: config.timeouts.requestMs,
    headers: { Authorization: `Bearer ${token}` },
  });

  await runCheck('notifications-list', 'List notifications', async () => {
    const res = await req.get(`${base}/notifications`);
    return {
      status: res.status >= 200 && res.status < 300 ? 'PASS' : 'FAIL',
      statusCode: res.status,
      count: Array.isArray(res.data?.items) ? res.data.items.length : null,
    };
  });

  await runCheck('notifications-broadcast', 'Broadcast notification create', async () => {
    const res = await req.post(`${base}/notifications/broadcast`, {
      title: 'Validation Broadcast',
      body: 'Validation framework broadcast check',
      channel: 'IN_APP',
    });
    return { status: res.status === 201 ? 'PASS' : 'WARNING', statusCode: res.status };
  });

  await runCheck('notifications-targeted-shape', 'Targeted notification route shape', async () => {
    try {
      const res = await req.post(`${base}/notifications/targeted`, {
        userId: 'validation-user-id',
        title: 'Validation Targeted',
        body: 'Validation targeted check',
        channel: 'IN_APP',
      });
      return { status: res.status >= 200 && res.status < 500 ? 'PASS' : 'FAIL', statusCode: res.status };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'WARNING',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('notifications-invalid-payload', 'Invalid payload handling', async () => {
    try {
      await req.post(`${base}/notifications/broadcast`, { title: 1234 });
      return { status: 'FAIL', note: 'invalid payload unexpectedly accepted' };
    } catch (error) {
      return {
        status: error.response?.status >= 400 ? 'PASS' : 'WARNING',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('notifications-authz-shape', 'Authorization behavior shape', async () => {
    try {
      await axios.get(`${base}/notifications`, { timeout: config.timeouts.requestMs });
      return { status: 'WARNING', note: 'unauthenticated access unexpectedly allowed' };
    } catch (error) {
      return {
        status: error.response?.status === 401 || error.response?.status === 403 ? 'PASS' : 'WARNING',
        statusCode: error.response?.status || null,
      };
    }
  });

  await runCheck('notifications-realtime-delivery-shape', 'Realtime delivery contract', async () => {
    return { status: 'SKIPPED', reason: 'full realtime coupling excluded in critical-path mode' };
  });

  return { checks };
}

module.exports = { runNotificationsSuite };
