const PRIVATE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.0.2.2',
  'host.docker.internal',
]);

export function resolveApiPublicOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = (env.API_PUBLIC_URL ?? 'http://localhost:4000').trim().replace(/\/$/, '');
  return raw.replace(/\/api\/v\d+$/i, '');
}

export function toPublicAssetUrl(
  url: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (url == null) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const origin = resolveApiPublicOrigin(env);
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (PRIVATE_HOSTS.has(parsed.hostname)) {
      return `${origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
