#!/usr/bin/env node
/**
 * Restores bundled logo assets and generates launcher icons for release builds.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const root = resolve(process.cwd());
const mobileRoot = resolve(root, 'apps/mobile-flutter');
const assetsDir = resolve(mobileRoot, 'assets/images');
const logoPath = resolve(assetsDir, 'logo.png');
const iconPath = resolve(assetsDir, 'logo_icon.png');
const buildLogo = resolve(
  mobileRoot,
  'build/unit_test_assets/assets/images/logo.png',
);

const sources = [
  buildLogo,
  resolve(mobileRoot, 'assets/images/logo.png'),
];

mkdirSync(assetsDir, { recursive: true });

const source = sources.find((candidate) => existsSync(candidate));
if (!source) {
  console.error('[release-assets] logo.png not found. Run flutter test once or add assets/images/logo.png.');
  process.exit(1);
}

if (source !== logoPath) {
  copyFileSync(source, logoPath);
  console.log(`[release-assets] Copied logo -> ${logoPath}`);
}

execSync(`python "${resolve(mobileRoot, 'scripts/generate_logo_icon.py')}"`, {
  stdio: 'inherit',
  cwd: mobileRoot,
});

execSync('dart run flutter_launcher_icons', {
  stdio: 'inherit',
  cwd: mobileRoot,
});

console.log('[release-assets] Launcher icons generated.');
