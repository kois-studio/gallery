import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import { rm } from 'node:fs/promises'
import { GalleryService, removePhotoObjects } from '../galleries/gallery.service.js'
import { LocalStorageService } from '../storage/storage.service.js'
import { PhotoRepository, type PhotoRecord } from './photo.repository.js'
import { ProcessingRepository } from './processing.repository.js'

const maximumFileBytes = 100 * 1024 * 1024
const maximumFiles = 500
const maximumBatchBytes = 10 * 1024 * 1024 * 1024

interface UploadedFile {
    path: string
    originalname: string
    size: number
}

export interface UploadResult {
    photoId?: string
    originalName: string
    bytes: number
    status: 'queued' | 'rejected'
    reason?: string
}

@Injectable()
export class UploadService {
    constructor(
        private readonly galleries: GalleryService,
        private readonly photos: PhotoRepository,
        private readonly storage: LocalStorageService,
        private readonly jobs: ProcessingRepository,
    ) {}

    async upload(galleryId: string, files: UploadedFile[]): Promise<UploadResult[]> {
        this.galleries.get(galleryId)
        if (files.length === 0) {
            throw new BadRequestException('At least one file is required')
        }
        if (files.length > maximumFiles) {
            throw new BadRequestException(`A batch cannot contain more than ${maximumFiles} files`)
        }

        const totalBytes = files.reduce((total, file) => total + file.size, 0)
        if (totalBytes > maximumBatchBytes) {
            throw new BadRequestException('The batch exceeds the 10 GiB limit')
        }

        const results: UploadResult[] = []
        for (const file of files) {
            results.push(await this.persistFile(galleryId, file))
        }
        return results
    }

    list(galleryId: string): PhotoRecord[] {
        this.galleries.get(galleryId)
        return this.photos.listByGallery(galleryId)
    }

    get(galleryId: string, photoId: string): PhotoRecord {
        this.galleries.get(galleryId)
        const photo = this.photos.getByGalleryAndId(galleryId, photoId)
        if (!photo) {
            throw new NotFoundException('Photo not found')
        }
        return photo
    }

    async cancel(galleryId: string, photoId: string): Promise<{ photoId: string; status: 'cancelled' }> {
        const photo = this.get(galleryId, photoId)
        if (!['pending', 'processing'].includes(photo.processing_status)) {
            throw new ConflictException('Only pending or processing photos can be cancelled')
        }
        if (!this.jobs.cancel(photo.id, new Date().toISOString())) {
            throw new ConflictException('The photo could not be cancelled')
        }

        await Promise.all([
            this.storage.remove(photo.original_key),
            photo.thumbnail_key ? this.storage.remove(photo.thumbnail_key) : Promise.resolve(),
            photo.display_key ? this.storage.remove(photo.display_key) : Promise.resolve(),
        ])
        return { photoId: photo.id, status: 'cancelled' }
    }

    async delete(galleryId: string, photoId: string): Promise<void> {
        const photo = this.get(galleryId, photoId)
        if (this.photos.delete(galleryId, photo.id) === 0) {
            throw new NotFoundException('Photo not found')
        }
        // Metadata goes first so visitors stop seeing the photo even if object removal fails.
        await removePhotoObjects(this.storage, [photo])

        const gallery = this.galleries.get(galleryId)
        if (gallery.cover_photo_id === photo.id) {
            this.galleries.replaceCover(galleryId)
        }
    }

    retry(galleryId: string, photoId: string): { photoId: string; status: 'pending' } {
        const photo = this.get(galleryId, photoId)
        if (photo.processing_status !== 'failed') {
            throw new ConflictException('Only failed photos can be retried')
        }
        if (!this.jobs.retry(photo.id, new Date().toISOString())) {
            throw new ConflictException('The photo could not be retried')
        }
        return { photoId: photo.id, status: 'pending' }
    }

    private async persistFile(galleryId: string, file: UploadedFile): Promise<UploadResult> {
        const originalName = safeOriginalName(file.originalname)
        try {
            if (file.size <= 0 || file.size > maximumFileBytes) {
                throw new Error('File exceeds the 100 MiB limit or is empty')
            }

            const source = await detectSourceFormat(file.path)
            if (!source) {
                throw new Error('Only JPEG, PNG, and WebP images are accepted')
            }

            const photoId = randomUUID()
            const originalKey = `galleries/${galleryId}/original/${photoId}.${source.extension}`
            await this.storage.moveAtomically(file.path, originalKey)

            let photo: PhotoRecord
            try {
                photo = this.photos.insertUploaded({
                    id: photoId,
                    galleryId,
                    originalName,
                    originalKey,
                    mimeType: source.mimeType,
                    originalBytes: file.size,
                    now: new Date().toISOString(),
                })
            } catch (error) {
                await this.storage.remove(originalKey)
                throw error
            }

            return {
                photoId: photo.id,
                originalName: photo.original_name,
                bytes: photo.original_bytes,
                status: 'queued',
            }
        } catch (error) {
            return {
                originalName,
                bytes: file.size,
                status: 'rejected',
                reason: safeReason(error),
            }
        } finally {
            await rm(file.path, { force: true })
        }
    }
}

async function detectSourceFormat(path: string): Promise<{ extension: 'jpg' | 'png' | 'webp'; mimeType: string } | undefined> {
    const { open } = await import('node:fs/promises')
    const handle = await open(path, 'r')
    try {
        const header = Buffer.alloc(12)
        const { bytesRead } = await handle.read(header, 0, header.length, 0)
        if (bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
            return { extension: 'jpg', mimeType: 'image/jpeg' }
        }
        if (bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
            return { extension: 'png', mimeType: 'image/png' }
        }
        if (bytesRead >= 12 && header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
            return { extension: 'webp', mimeType: 'image/webp' }
        }
        return undefined
    } finally {
        await handle.close()
    }
}

/** Multer exposes multipart filenames as latin1; recover the UTF-8 name browsers actually send. */
export function decodeMultipartFilename(name: string): string {
    if ([...name].some(character => character.charCodeAt(0) > 0xff)) {
        return name
    }
    const decoded = Buffer.from(name, 'latin1').toString('utf8')
    return decoded.includes('\uFFFD') ? name : decoded
}

function safeOriginalName(originalName: string): string {
    const name = basename(decodeMultipartFilename(originalName))
        .split('')
        .filter(character => character.charCodeAt(0) >= 32)
        .join('')
        .trim()
    return name.slice(0, 240) || 'unnamed'
}

function safeReason(error: unknown): string {
    if (error instanceof Error && error.message.length <= 160) {
        return error.message
    }
    return 'File could not be accepted'
}
