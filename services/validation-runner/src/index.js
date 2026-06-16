const { config } = require('./core/config');
const { logger } = require('./core/logger');
const { buildArtifact, writeArtifact, ensureDir } = require('./core/artifact-writer');
const { runInfrastructureSuite } = require('./suites/infrastructure');
const { runAuthSuite } = require('./suites/auth');
const { runWebsocketSuite } = require('./suites/websocket');
const { runPaymentsSuite } = require('./suites/payments');
const { runNotificationsSuite } = require('./suites/notifications');
const { buildReadinessReport } = require('./reporting/readiness-report');

async function runSuite({ suiteName, runner }) {
  const started = Date.now();
  const result = await runner({ config });
  return {
    artifact: buildArtifact({
      environment: config.environment,
      suite: suiteName,
      checks: result.checks || [],
      metadata: {
        durationMs: Date.now() - started,
      },
    }),
  };
}

async function main() {
  ensureDir(config.artifactsDir);
  logger.info({ artifactsDir: config.artifactsDir }, 'validation run started');

  const suites = [
    { suiteName: 'runtime', filename: 'runtime-evidence.json', runner: runInfrastructureSuite },
    { suiteName: 'auth', filename: 'auth-evidence.json', runner: runAuthSuite },
    { suiteName: 'websocket', filename: 'websocket-evidence.json', runner: runWebsocketSuite },
    { suiteName: 'payments', filename: 'payments-evidence.json', runner: runPaymentsSuite },
    { suiteName: 'notifications', filename: 'notifications-evidence.json', runner: runNotificationsSuite },
  ];

  const evidenceMap = {};

  for (const suite of suites) {
    const { artifact } = await runSuite(suite);
    evidenceMap[suite.suiteName] = artifact;
    const out = writeArtifact({
      artifactsDir: config.artifactsDir,
      filename: suite.filename,
      artifact,
    });
    logger.info({ suite: suite.suiteName, out }, 'suite artifact written');
  }

  const readiness = buildReadinessReport({
    environment: config.environment,
    evidenceMap,
  });

  const readinessPath = writeArtifact({
    artifactsDir: config.artifactsDir,
    filename: 'readiness-report.json',
    artifact: readiness,
  });

  logger.info({ readinessPath, overallScore: readiness.overallScore }, 'validation run completed');

  if ((readiness.blockingFailures || []).length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logger.error({ error: error.message, stack: error.stack }, 'validation run failed');
  process.exit(1);
});
