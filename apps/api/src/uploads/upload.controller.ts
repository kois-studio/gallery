import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { CsrfGuard } from '../auth/csrf.guard.js';
import { GalleryFilesInterceptor } from './upload.interceptor.js';
import { UploadService } from './upload.service.js';

@Controller('api/admin/galleries/:galleryId/photos')
@UseGuards(AdminAuthGuard)
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post()
  @UseGuards(CsrfGuard)
  @UseInterceptors(GalleryFilesInterceptor())
  async upload(
    @Param('galleryId') galleryId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return { files: await this.uploads.upload(galleryId, files ?? []) };
  }

  @Get()
  list(@Param('galleryId') galleryId: string) {
    return {
      files: this.uploads.list(galleryId).map((photo) => ({
        photoId: photo.id,
        originalName: photo.original_name,
        bytes: photo.original_bytes,
        status: photo.processing_status,
      })),
    };
  }
}
