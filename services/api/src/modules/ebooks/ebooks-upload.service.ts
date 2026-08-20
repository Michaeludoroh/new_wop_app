import { Injectable } from '@nestjs/common';
import { persistUploadedFile, IMAGE_EXTENSIONS, IMAGE_MIME_EXTENSIONS, PDF_MIME_EXTENSIONS } from '../../common/persist-uploaded-file.util';
import { UploadedBinary } from '../../common/read-uploaded-file.util';

type UploadKind = 'file' | 'cover';

@Injectable()
export class EbooksUploadService {
  async saveUpload(
    file: UploadedBinary | undefined,
    kind: UploadKind,
  ): Promise<{ url: string; key: string; storageKey: string }> {
    const isPdf = kind === 'file';
    const result = await persistUploadedFile(file, {
      relativeDirectory: isPdf ? 'ebooks/file' : 'ebooks/cover',
      allowedExtensions: isPdf ? new Set(['.pdf']) : IMAGE_EXTENSIONS,
      mimeExtensionMap: isPdf ? PDF_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS,
      emptyMessage: 'A file is required',
      typeMessage: isPdf
        ? 'Only PDF files are allowed for eBook uploads'
        : 'Cover uploads must be JPG, PNG, WEBP, or GIF',
      logKind: `ebooks.${kind}`,
    });

    return {
      url: result.url,
      key: result.key,
      storageKey: result.key,
    };
  }
}
