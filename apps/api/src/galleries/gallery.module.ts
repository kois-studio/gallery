import { Module } from '@nestjs/common';
import { GalleryController } from './gallery.controller.js';
import { GalleryRepository } from './gallery.repository.js';
import { GalleryService } from './gallery.service.js';
import { PhotoRepository } from '../uploads/photo.repository.js';

@Module({
  controllers: [GalleryController],
  providers: [GalleryRepository, GalleryService, PhotoRepository],
  exports: [GalleryService, PhotoRepository, GalleryRepository],
})
export class GalleryModule {}
