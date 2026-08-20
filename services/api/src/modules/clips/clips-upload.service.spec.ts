import { mkdirSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ClipsUploadService } from './clips-upload.service';
import { extractRelativeMediaKey, resolveMediaAbsolutePath } from '../../common/media-storage.util';

describe('ClipsUploadService persistent storage', () => {
  const originalMediaRoot = process.env.MEDIA_ROOT;

  afterEach(() => {
    if (originalMediaRoot === undefined) {
      delete process.env.MEDIA_ROOT;
    } else {
      process.env.MEDIA_ROOT = originalMediaRoot;
    }
  });

  it('writes clip media under MEDIA_ROOT and returns a relative media key', async () => {
    const root = mkdtempSync(join(tmpdir(), 'wopp-clips-'));
    process.env.MEDIA_ROOT = root;
    mkdirSync(join(root, 'clips', 'media'), { recursive: true });

    const service = new ClipsUploadService();
    const result = await service.saveUpload(
      { originalname: 'faith.mp4', buffer: Buffer.from('fake-mp4-bytes') },
      'media',
    );

    expect(result.key).toMatch(/^clips\/media\/.+\.mp4$/);
    expect(extractRelativeMediaKey(result.url)).toBe(result.key);

    const absolute = resolveMediaAbsolutePath(result.key, undefined, { MEDIA_ROOT: root });
    expect(absolute).toBeTruthy();
    expect(readFileSync(absolute!).toString()).toBe('fake-mp4-bytes');
  });
});
