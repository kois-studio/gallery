import { Module } from '@nestjs/common';
import { GalleryController } from './gallery.controller.js';
import { GalleryRepository } from './gallery.repository.js';
import { GalleryService } from './gallery.service.js';

@Module({
  controllers: [GalleryController],
  providers: [GalleryRepository, GalleryService],
})
export class GalleryModule {}
