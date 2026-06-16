const path = require('path');
require('dotenv').config();

const config = {
  environment: process.env.VALIDATION_ENV || 'local',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  wsBaseUrl: process.env.WS_BASE_URL || 'http://localhost:3002/realtime',
  artifactsDir:
    process.env.ARTIFACTS_DIR ||
    path.resolve(__dirname, '..', '..', 'artifacts'),
  auth: {
    email: process.env.VALIDATION_EMAIL || 'superadmin@wop.local',
    password: process.env.VALIDATION_PASSWORD || 'Password123!',
  },
  timeouts: {
    requestMs: Number(process.env.VALIDATION_REQUEST_TIMEOUT_MS || 8000),
    socketMs: Number(process.env.VALIDATION_SOCKET_TIMEOUT_MS || 8000),
  },
  observabilityHooks: {
    sentryDsnEnv: 'SENTRY_DSN',
    prometheusPushgatewayEnv: 'PROMETHEUS_PUSHGATEWAY_URL',
    grafanaLokiUrlEnv: 'GRAFANA_LOKI_URL',
    alertWebhookEnv: 'ALERT_WEBHOOK_URL',
  },
};

module.exports = { config };
