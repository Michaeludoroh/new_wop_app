const { CheckStatus } = require('./types');

const ALLOWED = new Set(Object.values(CheckStatus));

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return CheckStatus.SKIPPED;
  const normalized = status.trim().toUpperCase();
  if (ALLOWED.has(normalized)) return normalized;
  return CheckStatus.SKIPPED;
}

function aggregateSuiteStatus(checks = []) {
  const normalized = checks.map((c) => normalizeStatus(c.status));
  if (normalized.includes(CheckStatus.FAIL)) return CheckStatus.FAIL;
  if (normalized.includes(CheckStatus.WARNING)) return CheckStatus.WARNING;
  if (normalized.includes(CheckStatus.PASS)) return CheckStatus.PASS;
  return CheckStatus.SKIPPED;
}

module.exports = {
  normalizeStatus,
  aggregateSuiteStatus,
};
