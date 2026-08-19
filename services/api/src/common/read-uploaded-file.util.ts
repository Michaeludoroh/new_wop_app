import { readFile } from 'fs/promises';

export type UploadedBinary = {
  buffer?: Buffer;
  path?: string;
  originalname?: string;
};

export async function readUploadedBuffer(
  file?: UploadedBinary,
): Promise<Buffer | undefined> {
  if (file?.buffer?.length) {
    return file.buffer;
  }
  if (file?.path) {
    try {
      const fromDisk = await readFile(file.path);
      return fromDisk.length ? fromDisk : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
