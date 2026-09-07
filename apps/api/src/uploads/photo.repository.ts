import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'

export interface PhotoRecord {
    id: string
    gallery_id: string
    original_name: string
    original_key: string
    thumbnail_key: string | null
    display_key: string | null
    mime_type: string
    original_bytes: number
    width: number | null
    height: number | null
    position: number
    processing_status: 'pending' | 'processing' | 'ready' | 'failed' | 'cancelled'
    processing_error: string | null
    cancelled_at: string | null
    created_at: string
    updated_at: string
}

@Injectable()
export class PhotoRepository {
    constructor(private readonly database: DatabaseService) {}

    insertUploaded(input: {
        id: string
        galleryId: string
        originalName: string
        originalKey: string
        mimeType: string
        originalBytes: number
        now: string
    }): PhotoRecord {
        const insert = this.database.connection.transaction(() => {
            const positionRow = this.database.connection
                .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM photos WHERE gallery_id = ?')
                .get(input.galleryId) as { next_position: number }

            this.database.connection
                .prepare(
                    `INSERT INTO photos
            (id, gallery_id, original_name, original_key, mime_type, original_bytes, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .run(
                    input.id,
                    input.galleryId,
                    input.originalName,
                    input.originalKey,
                    input.mimeType,
                    input.originalBytes,
                    positionRow.next_position,
                    input.now,
                    input.now,
                )

            this.database.connection
                .prepare(
                    `INSERT INTO processing_jobs
            (id, photo_id, status, attempts, available_at, created_at, updated_at)
           VALUES (?, ?, 'queued', 0, ?, ?, ?)`,
                )
                .run(input.id, input.id, input.now, input.now, input.now)
        })

        insert()
        return this.getById(input.id)!
    }

    countNotReady(galleryId: string): number {
        const row = this.database.connection
            .prepare("SELECT COUNT(*) AS count FROM photos WHERE gallery_id = ? AND processing_status != 'ready'")
            .get(galleryId) as { count: number }
        return row.count
    }

    getByGalleryAndId(galleryId: string, id: string): PhotoRecord | undefined {
        const photo = this.database.connection.prepare('SELECT * FROM photos WHERE gallery_id = ? AND id = ?').get(galleryId, id) as
            | (Omit<PhotoRecord, 'processing_status'> & { processing_status: Exclude<PhotoRecord['processing_status'], 'cancelled'> })
            | undefined
        return photo ? withCancellationStatus(photo) : undefined
    }

    getById(id: string): PhotoRecord | undefined {
        const photo = this.database.connection.prepare('SELECT * FROM photos WHERE id = ?').get(id) as
            | (Omit<PhotoRecord, 'processing_status'> & { processing_status: Exclude<PhotoRecord['processing_status'], 'cancelled'> })
            | undefined
        return photo ? withCancellationStatus(photo) : undefined
    }

    listByGallery(galleryId: string): PhotoRecord[] {
        return this.database.connection
            .prepare('SELECT * FROM photos WHERE gallery_id = ? ORDER BY position ASC, id ASC')
            .all(galleryId)
            .map(photo =>
                withCancellationStatus(
                    photo as Omit<PhotoRecord, 'processing_status'> & {
                        processing_status: Exclude<PhotoRecord['processing_status'], 'cancelled'>
                    },
                ),
            )
    }
}

function withCancellationStatus(
    photo: Omit<PhotoRecord, 'processing_status'> & { processing_status: Exclude<PhotoRecord['processing_status'], 'cancelled'> },
): PhotoRecord {
    return {
        ...photo,
        processing_status: photo.cancelled_at ? 'cancelled' : photo.processing_status,
    }
}
