const CheckStatus = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARNING: 'WARNING',
  SKIPPED: 'SKIPPED',
});

function makeCheck({
  id,
  name,
  status = CheckStatus.SKIPPED,
  details = {},
  durationMs = 0,
}) {
  return {
    id,
    name,
    status,
    details,
    durationMs,
  };
}

function makeEvidence({
  environment,
  status = CheckStatus.SKIPPED,
  checks = [],
  metadata = {},
}) {
  return {
    timestamp: new Date().toISOString(),
    environment,
    status,
    checks,
    metadata,
  };
}

module.exports = {
  CheckStatus,
  makeCheck,
  makeEvidence,
};
