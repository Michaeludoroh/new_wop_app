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

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

const MIN_SECRET_LENGTH = 32;
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

export function validateSecurityConfig(
  env: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of REQUIRED_ENV_VARS) {
    const raw = env[key];
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new Error(
        `Security configuration error: required environment variable "${key}" is missing or empty.`,
      );
    }
  }

  const accessSecret = String(env.JWT_ACCESS_SECRET).trim();
  const refreshSecret = String(env.JWT_REFRESH_SECRET).trim();

  if (accessSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Security configuration error: JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  if (refreshSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `Security configuration error: JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }

  const lowerAccessSecret = accessSecret.toLowerCase();
  const lowerRefreshSecret = refreshSecret.toLowerCase();

  const isWeakAccessSecret = [...WEAK_SECRET_VALUES].some(
    (weak) => lowerAccessSecret === weak || lowerAccessSecret.includes(weak),
  );
  const isWeakRefreshSecret = [...WEAK_SECRET_VALUES].some(
    (weak) => lowerRefreshSecret === weak || lowerRefreshSecret.includes(weak),
  );

  if (isWeakAccessSecret) {
    throw new Error(
      'Security configuration error: JWT_ACCESS_SECRET is weak or placeholder-like and has been rejected.',
    );
  }

  if (isWeakRefreshSecret) {
    throw new Error(
      'Security configuration error: JWT_REFRESH_SECRET is weak or placeholder-like and has been rejected.',
    );
  }

  const accessExpiresIn = String(env.JWT_ACCESS_EXPIRES_IN).trim();
  const refreshExpiresIn = String(env.JWT_REFRESH_EXPIRES_IN).trim();

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

  return env;
}
