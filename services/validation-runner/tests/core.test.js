const fs = require('fs');
const os = require('os');
const path = require('path');

const { normalizeStatus, aggregateSuiteStatus } = require('../src/core/status');
const { calculateSuiteScore, calculateOverallScore } = require('../src/core/scoring');
const { buildArtifact, writeArtifact } = require('../src/core/artifact-writer');
const { buildReadinessReport } = require('../src/reporting/readiness-report');
const { config } = require('../src/core/config');

describe('validation-runner core framework', () => {
  test('status normalization enforces allowed enum', () => {
    expect(normalizeStatus('pass')).toBe('PASS');
    expect(normalizeStatus('FAIL')).toBe('FAIL');
    expect(normalizeStatus('unknown')).toBe('SKIPPED');
  });

  test('suite status aggregation prioritizes FAIL over WARNING/PASS', () => {
    const status = aggregateSuiteStatus([
      { status: 'PASS' },
      { status: 'WARNING' },
      { status: 'FAIL' },
    ]);
    expect(status).toBe('FAIL');
  });

  test('score calculation returns deterministic percentages', () => {
    const suiteScore = calculateSuiteScore([
      { status: 'PASS' },
      { status: 'WARNING' },
      { status: 'SKIPPED' },
      { status: 'FAIL' },
    ]);
    expect(suiteScore).toBe(43.75);

    const overall = calculateOverallScore({
      a: { checks: [{ status: 'PASS' }] },
      b: { checks: [{ status: 'FAIL' }] },
    });
    expect(overall).toBe(50);
  });

  test('artifact writer writes expected schema', () => {
    const artifact = buildArtifact({
      environment: 'test',
      suite: 'auth',
      checks: [{ id: 'x', name: 'x', status: 'PASS' }],
      metadata: { run: 1 },
    });

    expect(artifact).toHaveProperty('timestamp');
    expect(artifact).toHaveProperty('environment', 'test');
    expect(artifact).toHaveProperty('suite', 'auth');
    expect(artifact).toHaveProperty('status', 'PASS');
    expect(Array.isArray(artifact.checks)).toBe(true);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-artifacts-'));
    const out = writeArtifact({
      artifactsDir: tmpDir,
      filename: 'auth-evidence.json',
      artifact,
    });

    expect(fs.existsSync(out)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(parsed.suite).toBe('auth');
  });

  test('readiness report generation includes required keys', () => {
    const report = buildReadinessReport({
      environment: 'test',
      evidenceMap: {
        auth: { status: 'PASS', checks: [{ id: 'a1', name: 'auth', status: 'PASS' }] },
        websocket: { status: 'WARNING', checks: [{ id: 'w1', name: 'ws', status: 'WARNING' }] },
        payments: { status: 'FAIL', checks: [{ id: 'p1', name: 'payments', status: 'FAIL' }] },
        notifications: { status: 'SKIPPED', checks: [{ id: 'n1', name: 'notif', status: 'SKIPPED' }] },
        infrastructure: { status: 'PASS', checks: [{ id: 'i1', name: 'infra', status: 'PASS' }] },
      },
    });

    expect(report).toHaveProperty('overallScore');
    expect(report).toHaveProperty('suiteBreakdown');
    expect(report).toHaveProperty('blockingFailures');
    expect(report).toHaveProperty('warnings');
    expect(report).toHaveProperty('generatedAt');
  });

  test('config loads default critical fields', () => {
    expect(config).toHaveProperty('environment');
    expect(config).toHaveProperty('apiBaseUrl');
    expect(config).toHaveProperty('wsBaseUrl');
    expect(config).toHaveProperty('artifactsDir');
  });
});
