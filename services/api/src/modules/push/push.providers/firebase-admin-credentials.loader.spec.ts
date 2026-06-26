import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  FirebaseAdminCredentialsError,
  resolveFirebaseAdminCredentials,
  resolveServiceAccountFilePath,
} from './firebase-admin-credentials.loader';

const SAMPLE_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'ministry-mobile',
  client_email: 'firebase-adminsdk@test.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
};

describe('resolveFirebaseAdminCredentials', () => {
  it('prefers FIREBASE_SERVICE_ACCOUNT_JSON over file and split credentials', () => {
    const resolved = resolveFirebaseAdminCredentials({
      serviceAccountJson: JSON.stringify(SAMPLE_SERVICE_ACCOUNT),
      serviceAccountFile: './should-not-be-read.json',
      projectId: 'other-project',
      clientEmail: 'other@test.com',
      privateKey: 'key',
    });

    expect(resolved.source).toBe('json-env');
    expect(resolved.startupLogMessage).toBe('Firebase Admin initialized via JSON env');
    expect(resolved.credentials.projectId).toBe('ministry-mobile');
    expect(resolved.credentials.privateKey).toContain('\nabc\n');
  });

  it('loads credentials from FIREBASE_SERVICE_ACCOUNT_FILE when JSON env is unset', () => {
    const dir = mkdtempSync(join(tmpdir(), 'firebase-admin-creds-'));
    const filePath = join(dir, 'service-account.json');
    writeFileSync(filePath, JSON.stringify(SAMPLE_SERVICE_ACCOUNT), 'utf8');

    const resolved = resolveFirebaseAdminCredentials({
      serviceAccountFile: filePath,
      fileExists: existsSync,
    });

    expect(resolved.source).toBe('file');
    expect(resolved.startupLogMessage).toBe('Firebase Admin initialized via file');
    expect(resolved.credentials.clientEmail).toBe(SAMPLE_SERVICE_ACCOUNT.client_email);
  });

  it('falls back to split credentials when JSON env and file are unset', () => {
    const resolved = resolveFirebaseAdminCredentials({
      projectId: 'ministry-mobile',
      clientEmail: 'firebase-adminsdk@test.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });

    expect(resolved.source).toBe('split-credentials');
    expect(resolved.startupLogMessage).toBe('Firebase Admin initialized via split credentials');
  });

  it('throws a clear error for invalid JSON env', () => {
    expect(() =>
      resolveFirebaseAdminCredentials({
        serviceAccountJson: '{not-json',
      }),
    ).toThrow(new FirebaseAdminCredentialsError('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON'));
  });

  it('throws a clear error when service account file is missing', () => {
    expect(() =>
      resolveFirebaseAdminCredentials({
        serviceAccountFile: './missing-service-account.json',
        cwd: mkdtempSync(join(tmpdir(), 'firebase-admin-missing-')),
        fileExists: () => false,
      }),
    ).toThrow(/FIREBASE_SERVICE_ACCOUNT_FILE not found/);
  });

  it('throws a clear error when split credentials are incomplete', () => {
    expect(() =>
      resolveFirebaseAdminCredentials({
        projectId: 'ministry-mobile',
      }),
    ).toThrow(/Firebase Admin credentials are required/);
  });

  it('throws a clear error when parsed JSON is missing required fields', () => {
    expect(() =>
      resolveFirebaseAdminCredentials({
        serviceAccountJson: JSON.stringify({ project_id: 'only-project' }),
      }),
    ).toThrow(/missing required field\(s\): clientEmail, privateKey/);
  });
});

describe('resolveServiceAccountFilePath', () => {
  it('resolves relative paths from cwd', () => {
    const dir = mkdtempSync(join(tmpdir(), 'firebase-admin-path-'));
    const filePath = join(dir, 'account.json');
    writeFileSync(filePath, '{}', 'utf8');

    expect(resolveServiceAccountFilePath('account.json', dir, existsSync)).toBe(filePath);
  });
});
