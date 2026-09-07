import { Module } from '@nestjs/common';
import { GalleryModule } from '../galleries/gallery.module.js';
import { UploadController } from './upload.controller.js';
import { ProcessingRepository } from './processing.repository.js';
import { ProcessingWorker } from './processing.worker.js';
import { UploadService } from './upload.service.js';

@Module({
  imports: [GalleryModule],
  controllers: [UploadController],
  providers: [ProcessingRepository, ProcessingWorker, UploadService],
})
export class UploadModule {}
