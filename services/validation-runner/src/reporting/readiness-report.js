const { CheckStatus } = require('../core/types');
const { calculateOverallScore, calculateSuiteScore } = require('../core/scoring');
const { normalizeStatus } = require('../core/status');

function collectBlockingFailures(evidenceMap = {}) {
  const blocking = [];
  for (const [suiteName, suite] of Object.entries(evidenceMap)) {
    for (const check of suite.checks || []) {
      if (normalizeStatus(check.status) === CheckStatus.FAIL) {
        blocking.push({
          suite: suiteName,
          checkId: check.id,
          checkName: check.name,
          details: check.details || {},
        });
      }
    }
  }
  return blocking;
}

function collectWarnings(evidenceMap = {}) {
  const warnings = [];
  for (const [suiteName, suite] of Object.entries(evidenceMap)) {
    for (const check of suite.checks || []) {
      if (normalizeStatus(check.status) === CheckStatus.WARNING) {
        warnings.push({
          suite: suiteName,
          checkId: check.id,
          checkName: check.name,
          details: check.details || {},
        });
      }
    }
  }
  return warnings;
}

function buildGoRecommendation({ overallScore, blockingFailures = [], warnings = [] }) {
  if (blockingFailures.length > 0 || overallScore < 70) {
    return 'NO-GO';
  }
  if (warnings.length > 0 || overallScore < 85) {
    return 'CONDITIONAL GO';
  }
  return 'GO';
}

function buildReadinessReport({ environment, evidenceMap }) {
  const suiteBreakdown = {};
  for (const [suiteName, suite] of Object.entries(evidenceMap)) {
    suiteBreakdown[suiteName] = {
      status: suite.status,
      score: calculateSuiteScore(suite.checks || []),
      totalChecks: (suite.checks || []).length,
    };
  }

  const blockingFailures = collectBlockingFailures(evidenceMap);
  const warnings = collectWarnings(evidenceMap);
  const overallScore = calculateOverallScore(evidenceMap);
  const recommendation = buildGoRecommendation({ overallScore, blockingFailures, warnings });

  return {
    generatedAt: new Date().toISOString(),
    environment,
    auth: suiteBreakdown.auth || {},
    payments: suiteBreakdown.payments || {},
    notifications: suiteBreakdown.notifications || {},
    websocket: suiteBreakdown.websocket || {},
    infrastructure: suiteBreakdown.infrastructure || {},
    suiteBreakdown,
    overallScore,
    blockingFailures,
    warnings,
    recommendation,
  };
}

module.exports = {
  buildReadinessReport,
};
