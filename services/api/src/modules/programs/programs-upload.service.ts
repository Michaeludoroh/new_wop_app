import { Injectable } from '@nestjs/common';
import { persistUploadedFile, IMAGE_EXTENSIONS, IMAGE_MIME_EXTENSIONS } from '../../common/persist-uploaded-file.util';
import { UploadedBinary } from '../../common/read-uploaded-file.util';

@Injectable()
export class ProgramsUploadService {
  saveBanner(file: UploadedBinary | undefined) {
    return persistUploadedFile(file, {
      relativeDirectory: 'programs/banner',
      allowedExtensions: IMAGE_EXTENSIONS,
      mimeExtensionMap: IMAGE_MIME_EXTENSIONS,
      emptyMessage: 'An image file is required',
      typeMessage: 'Program images must be JPG, PNG, WEBP, or GIF',
      logKind: 'programs.banner',
    });
  }
}
