import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export type FirebaseCredentialSource = 'json-env' | 'file' | 'split-credentials';

export interface FirebaseServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface ResolvedFirebaseCredentials {
  credentials: FirebaseServiceAccountCredentials;
  source: FirebaseCredentialSource;
  startupLogMessage: string;
}

export class FirebaseAdminCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseAdminCredentialsError';
  }
}

type ServiceAccountJson = {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
};

export type ResolveFirebaseAdminCredentialsOptions = {
  serviceAccountJson?: string;
  serviceAccountFile?: string;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  cwd?: string;
  readFile?: (path: string) => string;
  fileExists?: (path: string) => boolean;
};

const STARTUP_LOG_BY_SOURCE: Record<FirebaseCredentialSource, string> = {
  'json-env': 'Firebase Admin initialized via JSON env',
  file: 'Firebase Admin initialized via file',
  'split-credentials': 'Firebase Admin initialized via split credentials',
};

export function resolveFirebaseAdminCredentials(
  options: ResolveFirebaseAdminCredentialsOptions,
): ResolvedFirebaseCredentials {
  const cwd = options.cwd ?? process.cwd();
  const readFile = options.readFile ?? ((filePath: string) => readFileSync(filePath, 'utf8'));
  const fileExists = options.fileExists ?? existsSync;

  const jsonEnv = options.serviceAccountJson?.trim();
  if (jsonEnv) {
    const parsed = parseServiceAccountJson(jsonEnv, 'FIREBASE_SERVICE_ACCOUNT_JSON');
    const credentials = mapParsedServiceAccount(parsed, 'FIREBASE_SERVICE_ACCOUNT_JSON');
    return toResolved(credentials, 'json-env');
  }

  const filePath = options.serviceAccountFile?.trim();
  if (filePath) {
    const parsed = loadServiceAccountFromFile(filePath, cwd, readFile, fileExists);
    const credentials = mapParsedServiceAccount(parsed, `FIREBASE_SERVICE_ACCOUNT_FILE (${filePath})`);
    return toResolved(credentials, 'file');
  }

  const credentials = mapSplitCredentials({
    projectId: options.projectId,
    clientEmail: options.clientEmail,
    privateKey: options.privateKey,
  });
  return toResolved(credentials, 'split-credentials');
}

function toResolved(
  credentials: FirebaseServiceAccountCredentials,
  source: FirebaseCredentialSource,
): ResolvedFirebaseCredentials {
  return {
    credentials,
    source,
    startupLogMessage: STARTUP_LOG_BY_SOURCE[source],
  };
}

function parseServiceAccountJson(raw: string, label: string): ServiceAccountJson {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected a JSON object');
    }
    return parsed as ServiceAccountJson;
  } catch {
    throw new FirebaseAdminCredentialsError(`${label} is not valid JSON`);
  }
}

function loadServiceAccountFromFile(
  filePath: string,
  cwd: string,
  readFile: (path: string) => string,
  fileExists: (path: string) => boolean,
): ServiceAccountJson {
  const resolvedPath = resolveServiceAccountFilePath(filePath, cwd, fileExists);

  let contents: string;
  try {
    contents = readFile(resolvedPath);
  } catch {
    throw new FirebaseAdminCredentialsError(
      `FIREBASE_SERVICE_ACCOUNT_FILE could not be read: ${filePath} (resolved: ${resolvedPath})`,
    );
  }

  if (!contents.trim()) {
    throw new FirebaseAdminCredentialsError(
      `FIREBASE_SERVICE_ACCOUNT_FILE is empty: ${filePath} (resolved: ${resolvedPath})`,
    );
  }

  return parseServiceAccountJson(contents, `FIREBASE_SERVICE_ACCOUNT_FILE (${filePath})`);
}

export function resolveServiceAccountFilePath(
  filePath: string,
  cwd: string,
  fileExists: (path: string) => boolean = existsSync,
): string {
  const candidates = isAbsolute(filePath)
    ? [filePath]
    : [resolve(cwd, filePath), resolve(cwd, 'services/api', filePath)];

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  throw new FirebaseAdminCredentialsError(
    `FIREBASE_SERVICE_ACCOUNT_FILE not found: ${filePath} (checked: ${candidates.join(', ')})`,
  );
}

function mapParsedServiceAccount(parsed: ServiceAccountJson, label: string): FirebaseServiceAccountCredentials {
  return assertServiceAccount(
    {
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: normalizePrivateKey(parsed.private_key ?? parsed.privateKey),
    },
    label,
  );
}

function mapSplitCredentials(value: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}): FirebaseServiceAccountCredentials {
  const projectId = value.projectId?.trim();
  const clientEmail = value.clientEmail?.trim();
  const privateKey = normalizePrivateKey(value.privateKey);

  if (!projectId || !clientEmail || !privateKey) {
    throw new FirebaseAdminCredentialsError(
      'Firebase Admin credentials are required: set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_FILE, or FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY',
    );
  }

  return assertServiceAccount({ projectId, clientEmail, privateKey }, 'FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY');
}

function normalizePrivateKey(value: string | undefined) {
  if (!value?.trim()) return undefined;
  return value.replace(/\\n/g, '\n');
}

function assertServiceAccount(
  value: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  },
  label: string,
): FirebaseServiceAccountCredentials {
  const missing: string[] = [];
  if (!value.projectId?.trim()) missing.push('projectId');
  if (!value.clientEmail?.trim()) missing.push('clientEmail');
  if (!value.privateKey?.trim()) missing.push('privateKey');

  if (missing.length > 0) {
    throw new FirebaseAdminCredentialsError(
      `Firebase Admin service account from ${label} is missing required field(s): ${missing.join(', ')}`,
    );
  }

  return {
    projectId: value.projectId!.trim(),
    clientEmail: value.clientEmail!.trim(),
    privateKey: value.privateKey!,
  };
}
