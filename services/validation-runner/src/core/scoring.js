const { CheckStatus } = require('./types');
const { normalizeStatus } = require('./status');

function scoreCheck(status) {
  switch (normalizeStatus(status)) {
    case CheckStatus.PASS:
      return 1;
    case CheckStatus.WARNING:
      return 0.5;
    case CheckStatus.SKIPPED:
      return 0.25;
    case CheckStatus.FAIL:
    default:
      return 0;
  }
}

function calculateSuiteScore(checks = []) {
  if (!checks.length) return 0;
  const total = checks.reduce((acc, c) => acc + scoreCheck(c.status), 0);
  return Number(((total / checks.length) * 100).toFixed(2));
}

function calculateOverallScore(suiteEvidenceMap = {}) {
  const suites = Object.values(suiteEvidenceMap);
  if (!suites.length) return 0;
  const suiteScores = suites.map((s) => calculateSuiteScore(s.checks || []));
  const total = suiteScores.reduce((a, b) => a + b, 0);
  return Number((total / suiteScores.length).toFixed(2));
}

module.exports = {
  scoreCheck,
  calculateSuiteScore,
  calculateOverallScore,
};
