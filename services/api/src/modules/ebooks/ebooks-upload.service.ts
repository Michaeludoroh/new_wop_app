import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { getMediaRoot } from '../../common/media-storage.util';
import { buildPublicUploadUrl } from '../../common/public-url.util';
import { readUploadedBuffer, UploadedBinary } from '../../common/read-uploaded-file.util';

type UploadKind = 'file' | 'cover';

const ALLOWED_EXTENSIONS: Record<UploadKind, Set<string>> = {
  file: new Set(['.pdf']),
  cover: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
};

@Injectable()
export class EbooksUploadService {
  private get uploadRoot() {
    return join(getMediaRoot(), 'ebooks');
  }

  async saveUpload(
    file: UploadedBinary | undefined,
    kind: UploadKind,
  ): Promise<{ url: string; key: string; storageKey: string }> {
    const buffer = await readUploadedBuffer(file);
    if (!buffer?.length) {
      throw new BadRequestException('A file is required');
    }

    const extension = extname(file?.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS[kind].has(extension)) {
      throw new BadRequestException(
        kind === 'file'
          ? 'Only PDF files are allowed for eBook uploads'
          : 'Cover uploads must be JPG, PNG, WEBP, or GIF',
      );
    }

    const directory = join(this.uploadRoot, kind);
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const relativeKey = `ebooks/${kind}/${filename}`;
    await writeFile(join(directory, filename), buffer);

    return {
      url: buildPublicUploadUrl(relativeKey),
      key: relativeKey,
      storageKey: relativeKey,
    };
  }
}
