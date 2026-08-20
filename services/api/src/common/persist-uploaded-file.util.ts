import { BadRequestException } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { getMediaRoot } from './media-storage.util';
import { buildPublicUploadUrl } from './public-url.util';
import { readUploadedBuffer, UploadedBinary } from './read-uploaded-file.util';

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const PDF_MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
};

export const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-m4v': '.m4v',
  'video/m4v': '.m4v',
};

export type PersistUploadedFileOptions = {
  relativeDirectory: string;
  allowedExtensions: Set<string>;
  mimeExtensionMap?: Record<string, string>;
  emptyMessage: string;
  typeMessage: string;
  logKind: string;
};

export type PersistedUpload = {
  url: string;
  key: string;
};

function resolveExtension(
  file: UploadedBinary | undefined,
  options: PersistUploadedFileOptions,
): string {
  const fromName = extname(file?.originalname || '').toLowerCase();
  if (fromName && options.allowedExtensions.has(fromName)) {
    return fromName;
  }

  const mime = (file?.mimetype || '').toLowerCase();
  const fromMime = options.mimeExtensionMap?.[mime];
  if (fromMime && options.allowedExtensions.has(fromMime)) {
    return fromMime;
  }

  return fromName;
}

export async function persistUploadedFile(
  file: UploadedBinary | undefined,
  options: PersistUploadedFileOptions,
): Promise<PersistedUpload> {
  const filename = file?.originalname || '';
  const mime = file?.mimetype || '';
  const declaredSize = typeof file?.size === 'number' ? file.size : undefined;

  const buffer = await readUploadedBuffer(file);
  if (!buffer?.length) {
    console.warn('[media] upload failed', {
      kind: options.logKind,
      filename,
      mime,
      bytes: declaredSize ?? 0,
      reason: 'EMPTY_FILE',
    });
    throw new BadRequestException(options.emptyMessage);
  }

  const extension = resolveExtension(file, options);
  if (!options.allowedExtensions.has(extension)) {
    console.warn('[media] upload failed', {
      kind: options.logKind,
      filename,
      mime,
      bytes: buffer.length,
      reason: 'UNSUPPORTED_TYPE',
    });
    throw new BadRequestException(options.typeMessage);
  }

  const relativeDirectory = options.relativeDirectory.replace(/^\/+|\/+$/g, '');
  const storedName = `${randomUUID()}${extension}`;
  const relativeKey = `${relativeDirectory}/${storedName}`;
  const directory = join(getMediaRoot(), relativeDirectory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, storedName), buffer);

  console.info('[media] upload saved', {
    kind: options.logKind,
    filename,
    mime,
    bytes: buffer.length,
    key: relativeKey,
  });

  return {
    url: buildPublicUploadUrl(relativeKey),
    key: relativeKey,
  };
}
