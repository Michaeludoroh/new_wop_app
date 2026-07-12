#!/usr/bin/env node
/**
 * Creates a local upload keystore + android/key.properties for release build validation.
 * Production teams should replace with their own Play Console upload key.
 *
 * Usage: node scripts/beta/setup-android-release-signing.mjs
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const root = resolve(process.cwd());
const androidDir = resolve(root, 'apps/mobile-flutter/android');
const keystorePath = resolve(androidDir, 'upload-keystore.jks');
const keyPropertiesPath = resolve(androidDir, 'key.properties');

if (existsSync(keyPropertiesPath) && existsSync(keystorePath)) {
  console.log('[android-signing] key.properties and upload-keystore.jks already exist.');
  process.exit(0);
}

mkdirSync(androidDir, { recursive: true });

const dname = 'CN=WOPP Release, OU=Mobile, O=Ministry Mobile, L=Unknown, ST=Unknown, C=US';
const storePassword = 'wopp-release-local';
const keyPassword = storePassword;

execSync(
  [
    'keytool',
    '-genkeypair',
    '-v',
    '-keystore',
    `"${keystorePath}"`,
    '-storetype',
    'JKS',
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-alias',
    'upload',
    '-storepass',
    storePassword,
    '-keypass',
    keyPassword,
    '-dname',
    `"${dname}"`,
  ].join(' '),
  { stdio: 'inherit', shell: true },
);

writeFileSync(
  keyPropertiesPath,
  [
    `storePassword=${storePassword}`,
    `keyPassword=${keyPassword}`,
    'keyAlias=upload',
    'storeFile=../upload-keystore.jks',
    '',
  ].join('\n'),
  'utf8',
);

console.log('[android-signing] Created local validation keystore:');
console.log(`  ${keystorePath}`);
console.log(`  ${keyPropertiesPath}`);
console.log('');
console.log('Replace with your Play Console upload key before store submission.');
