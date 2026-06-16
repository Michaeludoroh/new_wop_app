const axios = require('axios');
const { makeCheck } = require('../../core/types');

async function runInfrastructureSuite({ config }) {
  const checks = [];
  const started = Date.now();

  const endpoints = [
    { id: 'api-health', name: 'API health endpoint', url: `${config.apiBaseUrl}/health` },
    { id: 'ws-health', name: 'WebSocket service health endpoint', url: `${config.wsBaseUrl.replace('/realtime', '')}/api/v1/health` },
  ];

  for (const ep of endpoints) {
    const t0 = Date.now();
    try {
      const res = await axios.get(ep.url, { timeout: config.timeouts.requestMs });
      checks.push(
        makeCheck({
          id: ep.id,
          name: ep.name,
          status: res.status >= 200 && res.status < 300 ? 'PASS' : 'FAIL',
          details: { statusCode: res.status },
          durationMs: Date.now() - t0,
        }),
      );
    } catch (error) {
      checks.push(
        makeCheck({
          id: ep.id,
          name: ep.name,
          status: 'WARNING',
          details: { message: error.message },
          durationMs: Date.now() - t0,
        }),
      );
    }
  }

  return {
    checks,
    durationMs: Date.now() - started,
  };
}

module.exports = { runInfrastructureSuite };
