import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { getMediaRoot } from '../../common/media-storage.util';
import { buildPublicUploadUrl } from '../../common/public-url.util';
import { readUploadedBuffer, UploadedBinary } from '../../common/read-uploaded-file.util';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

@Injectable()
export class AnnouncementsUploadService {
  private get uploadRoot() {
    return join(getMediaRoot(), 'announcements');
  }

  async saveImage(file: UploadedBinary | undefined): Promise<{ url: string; key: string }> {
    const buffer = await readUploadedBuffer(file);
    if (!buffer?.length) {
      throw new BadRequestException('An image file is required');
    }

    const extension = extname(file?.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Announcement images must be JPG, PNG, WEBP, or GIF',
      );
    }

    const directory = join(this.uploadRoot, 'image');
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const relativeKey = `announcements/image/${filename}`;
    await writeFile(join(directory, filename), buffer);

    return {
      url: buildPublicUploadUrl(relativeKey),
      key: relativeKey,
    };
  }
}
