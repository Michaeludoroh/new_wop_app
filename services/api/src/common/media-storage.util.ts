import { existsSync } from 'fs';
import { isAbsolute, relative, resolve } from 'path';

export const DEFAULT_MEDIA_ROOT_DIRNAME = 'uploads';
export const MEDIA_SUBDIRECTORIES = [
  'ebooks',
  'clips',
  'programs',
  'events',
  'announcements',
  'images',
] as const;

export function getMediaRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MEDIA_ROOT?.trim();
  if (configured) {
    return resolve(configured);
  }
  return resolve(process.cwd(), DEFAULT_MEDIA_ROOT_DIRNAME);
}

export function extractRelativeMediaKey(
  raw: string,
  options?: { ebookLegacy?: boolean },
): string | null {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  let pathPart = normalized.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      pathPart = new URL(normalized).pathname;
    } catch {
      return null;
    }
  }

  let key = pathPart.replace(/^\/+/, '');
  key = key.replace(/^api\/v\d+\//i, '');
  if (key.startsWith('uploads/')) {
    key = key.slice('uploads/'.length);
  }
  key = key.replace(/^\/+/, '');

  if (options?.ebookLegacy && (key.startsWith('file/') || key.startsWith('cover/'))) {
    key = `ebooks/${key}`;
  }

  if (!key || key.includes('\0')) {
    return null;
  }

  return key;
}

export function resolveMediaAbsolutePath(
  raw: string,
  options?: { ebookLegacy?: boolean },
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const key = extractRelativeMediaKey(raw, options);
  if (!key) {
    return null;
  }

  const root = getMediaRoot(env);
  const absolute = resolve(root, key);
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || rel.split(/[/\\]/).includes('..')) {
    return null;
  }

  return absolute;
}

export function persistableMediaKey(
  raw: string | null | undefined,
  options?: { ebookLegacy?: boolean },
): string | null | undefined {
  if (raw == null) {
    return raw;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return raw;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const pathname = new URL(trimmed).pathname.replace(/\\/g, '/');
      if (!pathname.includes('/uploads/')) {
        return trimmed;
      }
    } catch {
      return trimmed;
    }
  }

  return extractRelativeMediaKey(trimmed, options) ?? trimmed;
}

export function mediaFileExists(
  raw: string,
  options?: { ebookLegacy?: boolean },
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const absolute = resolveMediaAbsolutePath(raw, options, env);
  return Boolean(absolute && existsSync(absolute));
}

export function isLocalUploadReference(raw: string | null | undefined): boolean {
  if (!raw?.trim()) {
    return false;
  }
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return Boolean(extractRelativeMediaKey(trimmed));
  }
  try {
    return new URL(trimmed).pathname.includes('/uploads/');
  } catch {
    return false;
  }
}
