import { Injectable } from '@nestjs/common';
import { persistUploadedFile, IMAGE_EXTENSIONS, IMAGE_MIME_EXTENSIONS, VIDEO_MIME_EXTENSIONS } from '../../common/persist-uploaded-file.util';
import { UploadedBinary } from '../../common/read-uploaded-file.util';

type ClipUploadKind = 'media' | 'thumbnail';

@Injectable()
export class ClipsUploadService {
  saveUpload(file: UploadedBinary | undefined, kind: ClipUploadKind): Promise<{ url: string; key: string }> {
    const isVideo = kind === 'media';
    return persistUploadedFile(file, {
      relativeDirectory: isVideo ? 'clips/media' : 'clips/thumbnail',
      allowedExtensions: isVideo
        ? new Set(['.mp4', '.webm', '.mov', '.m4v'])
        : IMAGE_EXTENSIONS,
      mimeExtensionMap: isVideo ? VIDEO_MIME_EXTENSIONS : IMAGE_MIME_EXTENSIONS,
      emptyMessage: 'A file is required',
      typeMessage: isVideo
        ? 'Clip media must be MP4, WEBM, MOV, or M4V. iOS playback requires MP4/H.264.'
        : 'Clip thumbnails must be JPG, PNG, WEBP, or GIF',
      logKind: `clips.${kind}`,
    });
  }
}
