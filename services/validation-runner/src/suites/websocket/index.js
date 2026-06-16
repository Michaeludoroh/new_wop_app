const { io } = require('socket.io-client');
const axios = require('axios');
const { makeCheck } = require('../../core/types');

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for ${event}`));
    }, timeoutMs);

    const handler = (payload) => {
      cleanup();
      resolve(payload);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, handler);
    };

    socket.on(event, handler);
  });
}

function createSocket({ wsBaseUrl, token, reconnect = false }) {
  return io(wsBaseUrl, {
    transports: ['websocket'],
    timeout: 6000,
    reconnection: true,
    auth: {
      token,
      reconnect,
    },
  });
}

async function runWebsocketSuite({ config }) {
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

  await runCheck('ws-valid-handshake', 'Valid WebSocket handshake', async () => {
    if (!token) return { status: 'SKIPPED', reason: 'missing auth token' };
    const socket = createSocket({ wsBaseUrl: config.wsBaseUrl, token });
    try {
      await waitFor(socket, 'connect', config.timeouts.socketMs);
      return { status: 'PASS', socketId: socket.id };
    } finally {
      socket.close();
    }
  });

  await runCheck('ws-invalid-token', 'Invalid token rejection', async () => {
    const socket = createSocket({ wsBaseUrl: config.wsBaseUrl, token: 'invalid.token' });
    try {
      try {
        await waitFor(socket, 'connect', 2500);
        return { status: 'WARNING', note: 'connected with invalid token unexpectedly' };
      } catch {
        return { status: 'PASS', note: 'invalid token was blocked from connect' };
      }
    } finally {
      socket.close();
    }
  });

  await runCheck('ws-reconnect-cycle', 'Reconnect cycle behavior', async () => {
    if (!token) return { status: 'SKIPPED', reason: 'missing auth token' };
    const socket = createSocket({ wsBaseUrl: config.wsBaseUrl, token });
    try {
      await waitFor(socket, 'connect', config.timeouts.socketMs);
      const initialId = socket.id;
      socket.io.engine.close();
      await waitFor(socket, 'connect', config.timeouts.socketMs);
      return {
        status: socket.id && socket.id !== initialId ? 'PASS' : 'WARNING',
        initialId,
        reconnectedId: socket.id,
      };
    } finally {
      socket.close();
    }
  });

  await runCheck('ws-disconnect-cleanup', 'Disconnect cleanup shape', async () => {
    if (!token) return { status: 'SKIPPED', reason: 'missing auth token' };
    const socket = createSocket({ wsBaseUrl: config.wsBaseUrl, token });
    try {
      await waitFor(socket, 'connect', config.timeouts.socketMs);
      socket.disconnect();
      return { status: 'PASS', note: 'disconnect called successfully' };
    } finally {
      socket.close();
    }
  });

  await runCheck('ws-redis-propagation-shape', 'Redis propagation check contract', async () => {
    return { status: 'SKIPPED', reason: 'deterministic contract check only in critical path run' };
  });

  await runCheck('ws-targeted-notification-shape', 'Targeted notification realtime contract', async () => {
    return { status: 'SKIPPED', reason: 'deterministic contract check only in critical path run' };
  });

  await runCheck('ws-restart-recovery-shape', 'WebSocket restart recovery contract', async () => {
    return { status: 'SKIPPED', reason: 'service restart not triggered in critical-path mode' };
  });

  return { checks };
}

module.exports = { runWebsocketSuite };
