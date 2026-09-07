import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const maximumFileBytes = 100 * 1024 * 1024;
const maximumFiles = 500;

export function GalleryFilesInterceptor() {
  return FilesInterceptor('files', maximumFiles, {
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const root = resolve(process.env.STORAGE_PATH || './.data/photos');
        const temporaryDirectory = join(root, '.tmp', 'uploads');
        mkdirSync(temporaryDirectory, { recursive: true });
        callback(null, temporaryDirectory);
      },
      filename: (_request, _file, callback) => {
        callback(null, `upload-${randomUUID()}`);
      },
    }),
    limits: {
      fileSize: maximumFileBytes,
      files: maximumFiles,
      fields: 4,
    },
  });
}
