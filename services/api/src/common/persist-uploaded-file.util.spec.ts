import { mkdirSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  IMAGE_EXTENSIONS,
  IMAGE_MIME_EXTENSIONS,
  PDF_MIME_EXTENSIONS,
  persistUploadedFile,
} from './persist-uploaded-file.util';

describe('persistUploadedFile', () => {
  const originalMediaRoot = process.env.MEDIA_ROOT;

  afterEach(() => {
    if (originalMediaRoot === undefined) {
      delete process.env.MEDIA_ROOT;
    } else {
      process.env.MEDIA_ROOT = originalMediaRoot;
    }
  });

  it('saves a relative media key and writes the file under MEDIA_ROOT', async () => {
    const root = mkdtempSync(join(tmpdir(), 'wopp-persist-'));
    process.env.MEDIA_ROOT = root;
    mkdirSync(join(root, 'ebooks', 'file'), { recursive: true });

    const result = await persistUploadedFile(
      { originalname: 'lesson.pdf', buffer: Buffer.from('%PDF-1.4 body') },
      {
        relativeDirectory: 'ebooks/file',
        allowedExtensions: new Set(['.pdf']),
        mimeExtensionMap: PDF_MIME_EXTENSIONS,
        emptyMessage: 'A file is required',
        typeMessage: 'Only PDF files are allowed',
        logKind: 'ebooks.file',
      },
    );

    expect(result.key).toMatch(/^ebooks\/file\/.+\.pdf$/);
    expect(result.url).toContain('/api/v1/uploads/ebooks/file/');
    expect(readFileSync(join(root, result.key)).toString()).toContain('%PDF-1.4');
  });

  it('uses MIME type when the filename has no extension', async () => {
    const root = mkdtempSync(join(tmpdir(), 'wopp-persist-mime-'));
    process.env.MEDIA_ROOT = root;

    const result = await persistUploadedFile(
      {
        originalname: 'cover',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image'),
      },
      {
        relativeDirectory: 'programs/banner',
        allowedExtensions: IMAGE_EXTENSIONS,
        mimeExtensionMap: IMAGE_MIME_EXTENSIONS,
        emptyMessage: 'An image file is required',
        typeMessage: 'Images must be JPG, PNG, WEBP, or GIF',
        logKind: 'programs.banner',
      },
    );

    expect(result.key).toMatch(/^programs\/banner\/.+\.jpg$/);
  });
});
