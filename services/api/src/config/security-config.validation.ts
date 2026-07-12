const WEAK_SECRET_VALUES = new Set([
  'secret',
  '123456',
  'changeme',
  'password',
  'default',
  'jwtsecret',
  'dev-access-secret',
  'dev-refresh-secret',
]);

const PLACEHOLDER_PREFIXES = ['replace_with_'];

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

const PRODUCTION_REQUIRED_ENV_VARS = [
  'CORS_ORIGIN',
  'CONTENT_ACCESS_SECRET',
  'METRICS_AUTH_TOKEN',
  'REDIS_URL',
] as const;

const MIN_SECRET_LENGTH = 32;
const METRICS_MIN_LENGTH = 16;
const ACCESS_MIN_SECONDS = 60;
const ACCESS_MAX_SECONDS = 24 * 60 * 60; // 1 day
const REFRESH_MIN_SECONDS = 5 * 60; // 5 minutes
const REFRESH_MAX_SECONDS = 90 * 24 * 60 * 60; // 90 days

function parseDurationToSeconds(input: string): number | null {
  const value = input.trim();

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 24 * 60 * 60;
    default:
      return null;
  }
}

function isProdLike(env: Record<string, unknown>): boolean {
  const nodeEnv = String(env.NODE_ENV ?? 'development');
  return ['production', 'staging'].includes(nodeEnv);
}

function assertNonEmptyString(env: Record<string, unknown>, key: string): string {
  const raw = env[key];
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      `Security configuration error: required environment variable "${key}" is missing or empty.`,
    );
  }
  return raw.trim();
}

function assertSecretStrength(name: string, value: string, minLength: number): void {
  if (value.length < minLength) {
    throw new Error(
      `Security configuration error: ${name} must be at least ${minLength} characters.`,
    );
  }

  const lower = value.toLowerCase();
  if (PLACEHOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    throw new Error(
      `Security configuration error: ${name} is a placeholder and must be replaced before deployment.`,
    );
  }

  if ([...WEAK_SECRET_VALUES].some((weak) => lower === weak || lower.includes(weak))) {
    throw new Error(
      `Security configuration error: ${name} is weak or placeholder-like and has been rejected.`,
    );
  }
}

export function validateSecurityConfig(
  env: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED_ENV_VARS) {
    const value = assertNonEmptyString(env, key);
    env[key] = value;
  }

  const accessSecret = String(env.JWT_ACCESS_SECRET);
  const refreshSecret = String(env.JWT_REFRESH_SECRET);

  assertSecretStrength('JWT_ACCESS_SECRET', accessSecret, MIN_SECRET_LENGTH);
  assertSecretStrength('JWT_REFRESH_SECRET', refreshSecret, MIN_SECRET_LENGTH);
  env.JWT_ACCESS_SECRET = accessSecret;
  env.JWT_REFRESH_SECRET = refreshSecret;

  if (accessSecret === refreshSecret) {
    throw new Error(
      'Security configuration error: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.',
    );
  }

  const accessExpiresIn = String(env.JWT_ACCESS_EXPIRES_IN);
  const refreshExpiresIn = String(env.JWT_REFRESH_EXPIRES_IN);

  const accessSeconds = parseDurationToSeconds(accessExpiresIn);
  if (
    accessSeconds === null ||
    accessSeconds < ACCESS_MIN_SECONDS ||
    accessSeconds > ACCESS_MAX_SECONDS
  ) {
    throw new Error(
      `Security configuration error: JWT_ACCESS_EXPIRES_IN must be a valid duration (e.g. "15m", "1h", "3600") between ${ACCESS_MIN_SECONDS}s and ${ACCESS_MAX_SECONDS}s.`,
    );
  }

  const refreshSeconds = parseDurationToSeconds(refreshExpiresIn);
  if (
    refreshSeconds === null ||
    refreshSeconds < REFRESH_MIN_SECONDS ||
    refreshSeconds > REFRESH_MAX_SECONDS
  ) {
    throw new Error(
      `Security configuration error: JWT_REFRESH_EXPIRES_IN must be a valid duration (e.g. "7d", "12h", "604800") between ${REFRESH_MIN_SECONDS}s and ${REFRESH_MAX_SECONDS}s.`,
    );
  }

  if (refreshSeconds <= accessSeconds) {
    throw new Error(
      'Security configuration error: JWT_REFRESH_EXPIRES_IN must be greater than JWT_ACCESS_EXPIRES_IN.',
    );
  }

  if (isProdLike(env)) {
    for (const key of PRODUCTION_REQUIRED_ENV_VARS) {
      assertNonEmptyString(env, key);
    }

    assertSecretStrength(
      'CONTENT_ACCESS_SECRET',
      assertNonEmptyString(env, 'CONTENT_ACCESS_SECRET'),
      MIN_SECRET_LENGTH,
    );
    assertSecretStrength(
      'METRICS_AUTH_TOKEN',
      assertNonEmptyString(env, 'METRICS_AUTH_TOKEN'),
      METRICS_MIN_LENGTH,
    );

    const corsOrigin = assertNonEmptyString(env, 'CORS_ORIGIN');
    if (corsOrigin.includes('*')) {
      throw new Error(
        'Security configuration error: CORS_ORIGIN must not contain wildcards in production.',
      );
    }
  }

  return env;
}
