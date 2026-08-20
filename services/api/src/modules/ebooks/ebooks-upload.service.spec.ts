import { mkdirSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EbooksUploadService } from './ebooks-upload.service';
import { extractRelativeMediaKey, resolveMediaAbsolutePath } from '../../common/media-storage.util';

describe('EbooksUploadService persistent storage', () => {
  const originalMediaRoot = process.env.MEDIA_ROOT;

  afterEach(() => {
    if (originalMediaRoot === undefined) {
      delete process.env.MEDIA_ROOT;
    } else {
      process.env.MEDIA_ROOT = originalMediaRoot;
    }
  });

  it('writes a PDF under MEDIA_ROOT and returns a relative media key', async () => {
    const root = mkdtempSync(join(tmpdir(), 'wopp-ebooks-'));
    process.env.MEDIA_ROOT = root;
    mkdirSync(join(root, 'ebooks', 'file'), { recursive: true });

    const service = new EbooksUploadService();
    const result = await service.saveUpload(
      { originalname: 'teaching.pdf', buffer: Buffer.from('%PDF-1.4 test') },
      'file',
    );

    expect(result.key).toMatch(/^ebooks\/file\/.+\.pdf$/);
    expect(result.storageKey).toBe(result.key);
    expect(extractRelativeMediaKey(result.url, { ebookLegacy: true })).toBe(result.key);

    const absolute = resolveMediaAbsolutePath(result.key, { ebookLegacy: true }, { MEDIA_ROOT: root });
    expect(absolute).toBeTruthy();
    expect(readFileSync(absolute!).toString()).toContain('%PDF-1.4');
  });
});
