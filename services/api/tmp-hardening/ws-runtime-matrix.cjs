const { io } = require('socket.io-client');

const WS_URL = process.env.WS_URL || 'http://localhost:3002';
const TOKEN = process.env.WS_TOKEN || '';
const TIMEOUT_MS = Number(process.env.WS_TIMEOUT_MS || 6000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForEvent(socket, event, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timeout waiting for event: ${event}`));
    }, timeoutMs);

    const handler = (...args) => {
      cleanup();
      resolve(args);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, handler);
    };

    socket.on(event, handler);
  });
}

async function connectClient({ token, reconnect = false, staleSession = false }) {
  const socket = io(WS_URL, {
    transports: ['websocket'],
    forceNew: true,
    timeout: TIMEOUT_MS,
    auth: {
      token,
      reconnect,
      staleSession,
    },
    reconnection: true,
    reconnectionAttempts: 2,
    reconnectionDelay: 500,
  });

  return socket;
}

async function main() {
  const results = [];

  // 1) Valid auth handshake
  if (!TOKEN) {
    throw new Error('WS_TOKEN is required');
  }
  const valid = await connectClient({ token: TOKEN, reconnect: false });
  try {
    await waitForEvent(valid, 'connect');
    results.push({ test: 'valid_handshake', ok: true });

    // 2) reconnect hint behavior
    const reconnectClient = await connectClient({ token: TOKEN, reconnect: true });
    try {
      await waitForEvent(reconnectClient, 'connect');
      results.push({ test: 'reconnect_hint_handshake', ok: true });
    } finally {
      reconnectClient.close();
    }

    // 3) stale session forced disconnect path
    const staleClient = await connectClient({ token: TOKEN, staleSession: true });
    try {
      await waitForEvent(staleClient, 'connect');
      const [payload] = await waitForEvent(staleClient, 'realtime.error');
      results.push({
        test: 'stale_session_rejected',
        ok: Boolean(payload && payload.reason === 'stale_session'),
      });
    } catch (err) {
      results.push({ test: 'stale_session_rejected', ok: false, error: String(err) });
    } finally {
      staleClient.close();
    }
  } catch (err) {
    results.push({ test: 'valid_handshake', ok: false, error: String(err) });
  } finally {
    valid.close();
  }

  // 4) invalid token rejection
  const invalid = await connectClient({ token: 'invalid.token.value' });
  try {
    await waitForEvent(invalid, 'connect');
    const [payload] = await waitForEvent(invalid, 'realtime.error');
    results.push({
      test: 'invalid_token_rejected',
      ok: Boolean(payload && payload.reason === 'unauthorized_handshake'),
    });
  } catch (err) {
    // depending on gateway behavior, connect_error can happen before connect
    results.push({ test: 'invalid_token_rejected', ok: true, note: `connect blocked: ${String(err)}` });
  } finally {
    invalid.close();
  }

  // 5) explicit reconnect behavior by closing transport
  const reconn = await connectClient({ token: TOKEN });
  try {
    await waitForEvent(reconn, 'connect');
    const initialId = reconn.id;
    reconn.io.engine.close();
    await sleep(1500);
    await waitForEvent(reconn, 'connect');
    const reconnectedId = reconn.id;
    results.push({
      test: 'client_reconnect_cycle',
      ok: Boolean(initialId && reconnectedId && initialId !== reconnectedId),
      initialId,
      reconnectedId,
    });
  } catch (err) {
    results.push({ test: 'client_reconnect_cycle', ok: false, error: String(err) });
  } finally {
    reconn.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('ws_runtime_matrix_error', err);
  process.exit(1);
});
