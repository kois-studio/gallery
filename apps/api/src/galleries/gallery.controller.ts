import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { CsrfGuard } from '../auth/csrf.guard.js';
import { GalleryService, type GalleryInput } from './gallery.service.js';

const galleryInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable().optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

@Controller('api/admin/galleries')
@UseGuards(AdminAuthGuard)
export class GalleryController {
  constructor(private readonly galleries: GalleryService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(CsrfGuard)
  create(@Body() body: unknown) {
    return serializeGallery(this.galleries.create(parseGalleryInput(body)));
  }

  @Get()
  list() {
    return { galleries: this.galleries.list().map(serializeGallery) };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return serializeGallery(this.galleries.get(id));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  update(@Param('id') id: string, @Body() body: unknown) {
    return serializeGallery(this.galleries.update(id, parseGalleryInput(body)));
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  delete(@Param('id') id: string): void {
    this.galleries.delete(id);
  }

  @Patch(':id/cover')
  @UseGuards(CsrfGuard)
  setCover(@Param('id') id: string, @Body() body: unknown) {
    const result = z.object({ photoId: z.string().uuid() }).safeParse(body);
    if (!result.success) {
      throw new BadRequestException('A valid photoId is required');
    }
    return serializeGallery(this.galleries.setCover(id, result.data.photoId));
  }

  @Post(':id/publish')
  @UseGuards(CsrfGuard)
  publish(@Param('id') id: string) {
    const result = this.galleries.publish(id);
    return { gallery: serializeGallery(result.gallery), sharePath: result.sharePath };
  }

  @Post(':id/rotate-link')
  @UseGuards(CsrfGuard)
  rotateLink(@Param('id') id: string) {
    const result = this.galleries.rotateShareLink(id);
    return { gallery: serializeGallery(result.gallery), sharePath: result.sharePath };
  }

  @Post(':id/unpublish')
  @UseGuards(CsrfGuard)
  unpublish(@Param('id') id: string) {
    return serializeGallery(this.galleries.unpublish(id));
  }
}

function parseGalleryInput(body: unknown): GalleryInput {
  const result = galleryInputSchema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException('Invalid gallery fields');
  }

  return {
    title: result.data.title,
    description: result.data.description ?? null,
    eventDate: result.data.eventDate ?? null,
  };
}

function serializeGallery(gallery: ReturnType<GalleryService['get']>) {
  return {
    id: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    description: gallery.description,
    eventDate: gallery.event_date,
    status: gallery.status,
    coverPhotoId: gallery.cover_photo_id,
    createdAt: gallery.created_at,
    updatedAt: gallery.updated_at,
    publishedAt: gallery.published_at,
  };
}
