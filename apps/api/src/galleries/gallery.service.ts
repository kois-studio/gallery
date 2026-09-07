import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { randomBytes } from 'node:crypto'
import { hashToken } from '../auth/auth.service.js'
import { GalleryRepository, type GalleryRecord } from './gallery.repository.js'
import { PhotoRepository } from '../uploads/photo.repository.js'

export interface GalleryInput {
    title: string
    description: string | null
    eventDate: string | null
}

@Injectable()
export class GalleryService {
    constructor(
        private readonly galleries: GalleryRepository,
        private readonly photos: PhotoRepository,
    ) {}

    create(input: GalleryInput): GalleryRecord {
        const now = new Date().toISOString()
        return this.galleries.create({
            id: randomUUID(),
            slug: this.uniqueSlug(input.title),
            title: input.title,
            description: input.description,
            eventDate: input.eventDate,
            now,
        })
    }

    list(): GalleryRecord[] {
        return this.galleries.list()
    }

    get(id: string): GalleryRecord {
        const gallery = this.galleries.getById(id)
        if (!gallery) {
            throw new NotFoundException('Gallery not found')
        }

        return gallery
    }

    update(id: string, input: GalleryInput): GalleryRecord {
        const current = this.get(id)
        const changes = this.galleries.updateDraft({
            id,
            ...input,
            now: new Date().toISOString(),
        })

        if (changes === 0 && current.status !== 'draft') {
            throw new ConflictException('Published galleries cannot be edited in this slice')
        }

        return this.get(id)
    }

    delete(id: string): void {
        const current = this.get(id)
        if (current.status !== 'draft') {
            throw new ConflictException('Published galleries cannot be deleted in this slice')
        }
        if (this.galleries.countPhotos(id) > 0) {
            throw new ConflictException('Gallery with stored photos cannot be deleted in this slice')
        }

        if (this.galleries.deleteDraft(id) === 0) {
            throw new NotFoundException('Gallery not found')
        }
    }

    setCover(id: string, photoId: string): GalleryRecord {
        const gallery = this.get(id)
        if (gallery.status !== 'draft') {
            throw new ConflictException('Published galleries cannot be changed in this slice')
        }
        const photo = this.photos.getById(photoId)
        if (!photo || photo.gallery_id !== id) {
            throw new NotFoundException('Photo not found in gallery')
        }
        if (photo.processing_status !== 'ready') {
            throw new ConflictException('Only processed photos can be selected as the cover')
        }

        this.galleries.setCover(id, photoId, new Date().toISOString())
        return this.get(id)
    }

    publish(id: string): { gallery: GalleryRecord; sharePath: string } {
        const gallery = this.get(id)
        if (gallery.status !== 'draft') {
            throw new ConflictException('Gallery is already published')
        }
        const photos = this.photos.listByGallery(id)
        if (photos.length === 0 || !gallery.cover_photo_id) {
            throw new ConflictException('A gallery needs photos and a cover before publication')
        }
        if (this.photos.countNotReady(id) > 0) {
            throw new ConflictException('All photos must finish processing before publication')
        }
        if (!this.photos.getByGalleryAndId(id, gallery.cover_photo_id)) {
            throw new ConflictException('The selected cover does not belong to this gallery')
        }

        const token = randomBytes(32).toString('base64url')
        const now = new Date().toISOString()
        this.galleries.publish(id, hashToken(token), now)
        this.galleries.revokeVisitorSessions(id, now)
        const published = this.get(id)
        return { gallery: published, sharePath: `/g/${published.slug}/${token}` }
    }

    rotateShareLink(id: string): { gallery: GalleryRecord; sharePath: string } {
        const gallery = this.get(id)
        if (gallery.status !== 'published') {
            throw new ConflictException('Only published galleries have a share link')
        }

        const token = randomBytes(32).toString('base64url')
        const now = new Date().toISOString()
        this.galleries.rotateShareToken(id, hashToken(token), now)
        this.galleries.revokeVisitorSessions(id, now)
        const rotated = this.get(id)
        return { gallery: rotated, sharePath: `/g/${rotated.slug}/${token}` }
    }

    unpublish(id: string): GalleryRecord {
        const gallery = this.get(id)
        if (gallery.status !== 'published') {
            throw new ConflictException('Gallery is not published')
        }
        const now = new Date().toISOString()
        this.galleries.unpublish(id, now)
        this.galleries.revokeVisitorSessions(id, now)
        return this.get(id)
    }

    private uniqueSlug(title: string): string {
        const base = slugify(title)
        let candidate = base
        let suffix = 2
        while (this.galleries.slugExists(candidate)) {
            candidate = `${base}-${suffix}`
            suffix += 1
        }
        return candidate
    }
}

export function slugify(value: string): string {
    const slug = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)

    return slug || 'gallery'
}
