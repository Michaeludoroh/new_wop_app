const fs = require('fs');
const path = require('path');
const { aggregateSuiteStatus } = require('./status');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildArtifact({ environment, suite, checks = [], metadata = {} }) {
  return {
    timestamp: new Date().toISOString(),
    environment,
    suite,
    status: aggregateSuiteStatus(checks),
    checks,
    metadata,
  };
}

function writeArtifact({ artifactsDir, filename, artifact }) {
  ensureDir(artifactsDir);
  const filePath = path.join(artifactsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2), 'utf8');
  return filePath;
}

module.exports = {
  ensureDir,
  buildArtifact,
  writeArtifact,
};
