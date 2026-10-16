import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes, randomUUID } from 'node:crypto'
import { hashToken } from '../auth/auth.service.js'
import { LocalStorageService } from '../storage/storage.service.js'
import { PhotoRepository, type PhotoRecord } from '../uploads/photo.repository.js'
import { GalleryRepository, type GalleryRecord } from './gallery.repository.js'

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
        private readonly storage: LocalStorageService,
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
        this.get(id)
        this.galleries.updateDetails({
            id,
            ...input,
            now: new Date().toISOString(),
        })
        return this.get(id)
    }

    async delete(id: string): Promise<void> {
        this.get(id)
        const photos = this.photos.listByGallery(id)
        if (this.galleries.delete(id) === 0) {
            throw new NotFoundException('Gallery not found')
        }
        // Metadata is removed first; an object left behind by a failed removal is reported by storage:verify.
        await removePhotoObjects(this.storage, photos)
    }

    setCover(id: string, photoId: string): GalleryRecord {
        this.get(id)
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

    /** Falls back to the first ready photo after the cover is removed, or clears the cover when none remain. */
    replaceCover(id: string): void {
        this.galleries.setCover(id, this.photos.firstReady(id)?.id ?? null, new Date().toISOString())
    }

    publish(id: string): { gallery: GalleryRecord; sharePath: string } {
        const gallery = this.get(id)
        if (gallery.status !== 'draft') {
            throw new ConflictException('Gallery is already published')
        }
        const cover = gallery.cover_photo_id ? this.photos.getByGalleryAndId(id, gallery.cover_photo_id) : undefined
        if (!cover || cover.processing_status !== 'ready') {
            throw new ConflictException('A gallery needs a processed cover photo before publication')
        }

        // Republishing restores the existing link; rotation is the explicit way to invalidate it.
        const token = gallery.share_token ?? randomBytes(32).toString('base64url')
        const now = new Date().toISOString()
        this.galleries.publish(id, token, hashToken(token), now)
        const published = this.get(id)
        return { gallery: published, sharePath: sharePath(published)! }
    }

    rotateShareLink(id: string): { gallery: GalleryRecord; sharePath: string } {
        const gallery = this.get(id)
        if (gallery.status !== 'published') {
            throw new ConflictException('Only published galleries have a share link')
        }

        const token = randomBytes(32).toString('base64url')
        const now = new Date().toISOString()
        this.galleries.rotateShareToken(id, token, hashToken(token), now)
        this.galleries.revokeVisitorSessions(id, now)
        const rotated = this.get(id)
        return { gallery: rotated, sharePath: sharePath(rotated)! }
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

/** The visitor path for a published gallery, or undefined when no readable link exists. */
export function sharePath(gallery: GalleryRecord): string | undefined {
    return gallery.status === 'published' && gallery.share_token ? `/g/${gallery.slug}/${gallery.share_token}` : undefined
}

export async function removePhotoObjects(storage: LocalStorageService, photos: PhotoRecord[]): Promise<void> {
    const keys = photos.flatMap(photo => [photo.original_key, photo.thumbnail_key, photo.display_key]).filter(key => key !== null)
    await Promise.allSettled(keys.map(key => storage.remove(key)))
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
