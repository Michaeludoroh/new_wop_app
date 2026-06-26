import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

type ClipUploadKind = 'media' | 'thumbnail';

const ALLOWED_EXTENSIONS: Record<ClipUploadKind, Set<string>> = {
  media: new Set(['.mp4', '.webm', '.mov', '.m4v']),
  thumbnail: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
};

@Injectable()
export class ClipsUploadService {
  private readonly uploadRoot = join(process.cwd(), 'uploads', 'clips');

  async saveUpload(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    kind: ClipUploadKind,
  ): Promise<{ url: string; key: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A file is required');
    }

    const extension = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS[kind].has(extension)) {
      throw new BadRequestException(
        kind === 'media'
          ? 'Clip media must be MP4, WEBM, MOV, or M4V'
          : 'Clip thumbnails must be JPG, PNG, WEBP, or GIF',
      );
    }

    const directory = join(this.uploadRoot, kind);
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const relativeKey = `clips/${kind}/${filename}`;
    await writeFile(join(directory, filename), file.buffer);

    const baseUrl = (process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(/\/$/, '');
    return {
      url: `${baseUrl}/api/v1/uploads/${relativeKey}`,
      key: relativeKey,
    };
  }
}
