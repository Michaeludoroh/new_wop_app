import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  extractRelativeMediaKey,
  getMediaRoot,
  isLocalUploadReference,
  persistableMediaKey,
  resolveMediaAbsolutePath,
} from './media-storage.util';

describe('media-storage.util', () => {
  const originalCwd = process.cwd();
  const originalMediaRoot = process.env.MEDIA_ROOT;

  afterEach(() => {
    if (originalMediaRoot === undefined) {
      delete process.env.MEDIA_ROOT;
    } else {
      process.env.MEDIA_ROOT = originalMediaRoot;
    }
    process.chdir(originalCwd);
  });

  it('defaults MEDIA_ROOT to <cwd>/uploads', () => {
    delete process.env.MEDIA_ROOT;
    expect(getMediaRoot({})).toBe(join(process.cwd(), 'uploads'));
  });

  it('uses MEDIA_ROOT when configured', () => {
    expect(getMediaRoot({ MEDIA_ROOT: '/app/uploads' }).replace(/\\/g, '/')).toMatch(
      /\/app\/uploads$/,
    );
  });

  it('extracts stable relative keys from public upload URLs', () => {
    expect(
      extractRelativeMediaKey(
        'https://woppandmopp.com/api/v1/uploads/ebooks/file/generated.pdf',
        { ebookLegacy: true },
      ),
    ).toBe('ebooks/file/generated.pdf');
    expect(extractRelativeMediaKey('clips/media/clip.mp4')).toBe('clips/media/clip.mp4');
    expect(extractRelativeMediaKey('file/legacy.pdf', { ebookLegacy: true })).toBe(
      'ebooks/file/legacy.pdf',
    );
  });

  it('keeps external URLs as-is for ledger/admin compatibility', () => {
    expect(persistableMediaKey('https://example.com/book.pdf')).toBe(
      'https://example.com/book.pdf',
    );
  });

  it('persists local upload URLs as relative keys', () => {
    expect(
      persistableMediaKey(
        'https://woppandmopp.com/api/v1/uploads/ebooks/file/generated.pdf',
        { ebookLegacy: true },
      ),
    ).toBe('ebooks/file/generated.pdf');
  });

  it('resolves MEDIA_ROOT + relative key and rejects path traversal', () => {
    const root = mkdtempSync(join(tmpdir(), 'wopp-media-'));
    mkdirSync(join(root, 'ebooks', 'file'), { recursive: true });
    const pdfPath = join(root, 'ebooks', 'file', 'generated.pdf');
    writeFileSync(pdfPath, '%PDF');

    const env = { MEDIA_ROOT: root };
    expect(
      resolveMediaAbsolutePath('ebooks/file/generated.pdf', { ebookLegacy: true }, env),
    ).toBe(pdfPath);
    expect(resolveMediaAbsolutePath('../etc/passwd', undefined, env)).toBeNull();
  });

  it('detects local upload references without treating CDN URLs as local files', () => {
    expect(isLocalUploadReference('clips/media/clip.mp4')).toBe(true);
    expect(
      isLocalUploadReference('https://woppandmopp.com/api/v1/uploads/clips/media/clip.mp4'),
    ).toBe(true);
    expect(isLocalUploadReference('https://cdn.example.com/clips/faith.mp4')).toBe(false);
  });
});
