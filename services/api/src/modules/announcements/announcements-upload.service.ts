import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

@Injectable()
export class AnnouncementsUploadService {
  private readonly uploadRoot = join(process.cwd(), 'uploads', 'announcements');

  async saveImage(
    file: { buffer?: Buffer; originalname?: string } | undefined,
  ): Promise<{ url: string; key: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('An image file is required');
    }

    const extension = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Announcement images must be JPG, PNG, WEBP, or GIF',
      );
    }

    const directory = join(this.uploadRoot, 'image');
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const relativeKey = `announcements/image/${filename}`;
    await writeFile(join(directory, filename), file.buffer);

    const baseUrl = (process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(
      /\/$/,
      '',
    );
    return {
      url: `${baseUrl}/api/v1/uploads/${relativeKey}`,
      key: relativeKey,
    };
  }
}
