import { Controller, Get, HttpCode, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import type { GalleryConfiguration } from '../configuration.js'
import { cookieValue, visitorCookieName, visitorCookiePath } from '../auth/cookies.js'
import { shouldUseSecureCookies } from '../auth/cookie-policy.js'
import { GalleryRepository } from '../galleries/gallery.repository.js'
import { PhotoRepository } from '../uploads/photo.repository.js'
import { LocalStorageService } from '../storage/storage.service.js'
import { ShareService } from './share.service.js'
import { VisitorAuthGuard, type VisitorRequest } from './visitor-auth.guard.js'

@Controller('api/share')
export class ShareController {
    constructor(
        private readonly shares: ShareService,
        private readonly config: ConfigService<GalleryConfiguration, true>,
    ) {}

    @Post(':slug/:token/session')
    @HttpCode(200)
    exchange(@Param('slug') slug: string, @Param('token') token: string, @Res({ passthrough: true }) response: Response) {
        const grant = this.shares.exchange(slug, token)
        const session = grant.session
        const secure = shouldUseSecureCookies(this.config)
        response.setHeader(
            'Set-Cookie',
            cookieValue(`${visitorCookieName}=${encodeURIComponent(grant.cookieValue)}`, {
                httpOnly: true,
                secure,
                maxAgeMs: Date.parse(session.expiresAt) - Date.now(),
                path: visitorCookiePath(session.slug),
            }),
        )
        return { slug: session.slug, expiresAt: session.expiresAt }
    }
}

@Controller('api/shared/galleries')
@UseGuards(VisitorAuthGuard)
export class SharedGalleryController {
    constructor(
        private readonly shares: ShareService,
        private readonly galleries: GalleryRepository,
        private readonly photos: PhotoRepository,
        private readonly storage: LocalStorageService,
    ) {}

    @Get(':slug')
    metadata(@Param('slug') slug: string, @Req() request: VisitorRequest) {
        const session = this.shares.requireGallerySession(request.visitorSession, slug)
        const gallery = this.galleries.getPublishedBySlug(slug)
        if (!gallery || gallery.id !== session.galleryId) {
            throw new NotFoundException('Gallery not found')
        }
        const photos = this.photos.listByGallery(gallery.id).filter(photo => photo.processing_status === 'ready')
        return {
            gallery: {
                slug: gallery.slug,
                title: gallery.title,
                description: gallery.description,
                eventDate: gallery.event_date,
                coverPhotoId: gallery.cover_photo_id,
            },
            photos: photos.map(photo => ({
                photoId: photo.id,
                originalName: photo.original_name,
                width: photo.width,
                height: photo.height,
                thumbnailUrl: `/api/shared/galleries/${gallery.slug}/photos/${photo.id}/thumbnail`,
                displayUrl: `/api/shared/galleries/${gallery.slug}/photos/${photo.id}/display`,
                originalUrl: `/api/shared/galleries/${gallery.slug}/photos/${photo.id}/original`,
            })),
        }
    }

    @Get(':slug/photos/:photoId/:variant')
    async media(
        @Param('slug') slug: string,
        @Param('photoId') photoId: string,
        @Param('variant') variant: string,
        @Req() request: VisitorRequest,
        @Res() response: Response,
    ): Promise<void> {
        const session = this.shares.requireGallerySession(request.visitorSession, slug)
        const photo = this.photos.getByGalleryAndId(session.galleryId, photoId)
        if (!photo || photo.processing_status !== 'ready') {
            response.status(404).json({ statusCode: 404, message: 'Photo not found' })
            return
        }

        const key =
            variant === 'thumbnail'
                ? photo.thumbnail_key
                : variant === 'display'
                  ? photo.display_key
                  : variant === 'original'
                    ? photo.original_key
                    : null
        if (!key) {
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
        const headers: Record<string, string> = {
            'Content-Type': variant === 'original' ? photo.mime_type : 'image/webp',
            'Cache-Control': 'private, max-age=86400',
        }
        if (variant === 'original') {
            headers['Content-Disposition'] = attachmentDisposition(photo.original_name)
        }
        // sendFile provides Content-Length, ETag, conditional requests, and Range support for resumable downloads.
        response.sendFile(path, { headers, cacheControl: false, lastModified: true }, error => {
            if (error && !response.headersSent) {
                response.status(404).json({ statusCode: 404, message: 'Photo object not found' })
            }
        })
    }
}

/** RFC 6266 attachment header with an ASCII fallback and a UTF-8 filename for accented or non-Latin names. */
export function attachmentDisposition(name: string): string {
    const cleaned = name.replace(/[\r\n]/g, '').slice(0, 240) || 'photo'
    const fallback = cleaned.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(cleaned).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)}`
}
