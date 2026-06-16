const pino = require('pino');

const logger = pino({
  name: 'validation-runner',
  level: process.env.VALIDATION_LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});

module.exports = { logger };
