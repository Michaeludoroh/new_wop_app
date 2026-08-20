import { Injectable } from '@nestjs/common';
import { persistUploadedFile, IMAGE_EXTENSIONS, IMAGE_MIME_EXTENSIONS } from '../../common/persist-uploaded-file.util';
import { UploadedBinary } from '../../common/read-uploaded-file.util';

type MentorshipUploadKind = 'banner' | 'mentor';

@Injectable()
export class MentorshipUploadService {
  saveImage(file: UploadedBinary | undefined, kind: MentorshipUploadKind) {
    const directory = kind === 'banner' ? 'mentorship/banner' : 'mentorship/mentor';
    return persistUploadedFile(file, {
      relativeDirectory: directory,
      allowedExtensions: IMAGE_EXTENSIONS,
      mimeExtensionMap: IMAGE_MIME_EXTENSIONS,
      emptyMessage: 'An image file is required',
      typeMessage: 'Mentorship images must be JPG, PNG, WEBP, or GIF',
      logKind: `mentorship.${kind}`,
    });
  }
}
