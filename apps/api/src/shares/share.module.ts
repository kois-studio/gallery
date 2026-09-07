import { Module } from '@nestjs/common';
import { GalleryModule } from '../galleries/gallery.module.js';
import { ShareController, SharedGalleryController } from './share.controller.js';
import { ShareService } from './share.service.js';
import { VisitorAuthGuard } from './visitor-auth.guard.js';

@Module({
  imports: [GalleryModule],
  controllers: [ShareController, SharedGalleryController],
  providers: [ShareService, VisitorAuthGuard],
})
export class ShareModule {}
