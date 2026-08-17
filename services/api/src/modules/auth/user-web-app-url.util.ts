const DEFAULT_PUBLIC_USER_ORIGIN = 'https://woppandmopp.com';
const ADMIN_WEB_HOST = 'admin.woppandmopp.com';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function originFromApiPublicUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return undefined;
  }
}

export function isAdminWebOrigin(value: string): boolean {
  try {
    return new URL(value).hostname.toLowerCase() === ADMIN_WEB_HOST;
  } catch {
    return value.toLowerCase().includes(ADMIN_WEB_HOST);
  }
}

export function normalizePublicUserOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    const origin = `${parsed.protocol}//${parsed.host}`;
    if (isAdminWebOrigin(origin)) {
      return null;
    }
    return origin;
  } catch {
    return null;
  }
}

export function resolveUserWebAppUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const candidates = [
    env.USER_WEB_APP_URL,
    env.PUBLIC_WEB_APP_URL,
    originFromApiPublicUrl(env.API_PUBLIC_URL),
    DEFAULT_PUBLIC_USER_ORIGIN,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePublicUserOrigin(candidate);
    if (normalized) {
      return stripTrailingSlash(normalized);
    }
  }

  return DEFAULT_PUBLIC_USER_ORIGIN;
}

export function buildUserPasswordResetUrl(
  rawToken: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const base = resolveUserWebAppUrl(env);
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export function buildUserLoginUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return `${resolveUserWebAppUrl(env)}/login`;
}

export function buildUserEmailVerificationUrl(
  rawToken: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const base = resolveUserWebAppUrl(env);
  return `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export const PUBLIC_RESET_PASSWORD_API_PATH = '/api/v1/auth/reset-password';
export const PUBLIC_RESET_PASSWORD_PAGE_PATH = '/reset-password';
