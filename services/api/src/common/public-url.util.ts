const PRIVATE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.0.2.2',
  'host.docker.internal',
]);

export function resolveApiPublicOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = (env.API_PUBLIC_URL ?? 'http://localhost:4000').trim().replace(/\/$/, '');
  return raw.replace(/\/api\/v\d+$/i, '');
}

export function collapseDuplicateApiPrefix(url: string): string {
  return url.replace(/(\/api\/v\d+)(?:\/api\/v\d+)+/gi, '$1');
}

export function buildPublicUploadUrl(
  relativeKey: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const key = relativeKey.replace(/^\/+/, '').replace(/^api\/v\d+\//i, '');
  const path = key.startsWith('uploads/') ? key : `uploads/${key}`;
  return collapseDuplicateApiPrefix(`${resolveApiPublicOrigin(env)}/api/v1/${path}`);
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
    return collapseDuplicateApiPrefix(`${origin}${trimmed}`);
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return buildPublicUploadUrl(trimmed, env);
  }

  try {
    const parsed = new URL(trimmed);
    if (PRIVATE_HOSTS.has(parsed.hostname)) {
      return collapseDuplicateApiPrefix(`${origin}${parsed.pathname}${parsed.search}`);
    }
    return collapseDuplicateApiPrefix(trimmed);
  } catch {
    return trimmed;
  }
}
