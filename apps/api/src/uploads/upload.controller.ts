import { Controller, Delete, Get, HttpCode, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import type { Response } from 'express'
import { AdminAuthGuard } from '../auth/admin-auth.guard.js'
import { CsrfGuard } from '../auth/csrf.guard.js'
import { GalleryFilesInterceptor } from './upload.interceptor.js'
import { UploadService } from './upload.service.js'
import { LocalStorageService } from '../storage/storage.service.js'

@Controller('api/admin/galleries/:galleryId/photos')
@UseGuards(AdminAuthGuard)
export class UploadController {
    constructor(
        private readonly uploads: UploadService,
        private readonly storage: LocalStorageService,
    ) {}

    @Post()
    @UseGuards(CsrfGuard)
    @UseInterceptors(GalleryFilesInterceptor())
    async upload(@Param('galleryId') galleryId: string, @UploadedFiles() files: Express.Multer.File[]) {
        return { files: await this.uploads.upload(galleryId, files ?? []) }
    }

    @Post(':photoId/cancel')
    @UseGuards(CsrfGuard)
    async cancel(@Param('galleryId') galleryId: string, @Param('photoId') photoId: string) {
        return this.uploads.cancel(galleryId, photoId)
    }

    @Post(':photoId/retry')
    @UseGuards(CsrfGuard)
    retry(@Param('galleryId') galleryId: string, @Param('photoId') photoId: string) {
        return this.uploads.retry(galleryId, photoId)
    }

    @Delete(':photoId')
    @HttpCode(204)
    @UseGuards(CsrfGuard)
    async delete(@Param('galleryId') galleryId: string, @Param('photoId') photoId: string): Promise<void> {
        await this.uploads.delete(galleryId, photoId)
    }

    @Get()
    list(@Param('galleryId') galleryId: string) {
        return {
            files: this.uploads.list(galleryId).map(photo => ({
                photoId: photo.id,
                originalName: photo.original_name,
                bytes: photo.original_bytes,
                status: photo.processing_status,
                processingError: photo.processing_error ?? undefined,
                width: photo.width,
                height: photo.height,
                capturedAt: photo.captured_at,
                thumbnailUrl:
                    photo.processing_status === 'ready' ? `/api/admin/galleries/${galleryId}/photos/${photo.id}/thumbnail` : undefined,
                displayUrl:
                    photo.processing_status === 'ready' ? `/api/admin/galleries/${galleryId}/photos/${photo.id}/display` : undefined,
            })),
        }
    }

    @Get(':photoId/:variant')
    async media(
        @Param('galleryId') galleryId: string,
        @Param('photoId') photoId: string,
        @Param('variant') variant: string,
        @Res() response: Response,
    ): Promise<void> {
        const photo = this.uploads.get(galleryId, photoId)
        const key = variant === 'display' ? photo.display_key : variant === 'thumbnail' ? photo.thumbnail_key : null
        if (!key || photo.processing_status !== 'ready') {
            response.status(404).json({ statusCode: 404, message: 'Photo variant not found' })
            return
        }
        let path: string
        try {
            path = await this.storage.pathForRead(key)
        } catch {
            response.status(404).json({ statusCode: 404, message: 'Photo object not found' })
            return
        }
        response.sendFile(
            path,
            { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' }, cacheControl: false },
            error => {
                if (error && !response.headersSent) {
                    response.status(404).json({ statusCode: 404, message: 'Photo object not found' })
                }
            },
        )
    }
}
