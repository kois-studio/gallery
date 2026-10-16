import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'

export interface GalleryRecord {
    id: string
    slug: string
    title: string
    description: string | null
    event_date: string | null
    status: 'draft' | 'published'
    cover_photo_id: string | null
    share_token_hash: string | null
    share_token: string | null
    created_at: string
    updated_at: string
    published_at: string | null
}

@Injectable()
export class GalleryRepository {
    constructor(private readonly database: DatabaseService) {}

    create(input: {
        id: string
        slug: string
        title: string
        description: string | null
        eventDate: string | null
        now: string
    }): GalleryRecord {
        this.database.connection
            .prepare(
                `INSERT INTO galleries
          (id, slug, title, description, event_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(input.id, input.slug, input.title, input.description, input.eventDate, input.now, input.now)

        return this.getById(input.id)!
    }

    list(): GalleryRecord[] {
        return this.database.connection.prepare('SELECT * FROM galleries ORDER BY updated_at DESC, id DESC').all() as GalleryRecord[]
    }

    getById(id: string): GalleryRecord | undefined {
        return this.database.connection.prepare('SELECT * FROM galleries WHERE id = ?').get(id) as GalleryRecord | undefined
    }

    updateDetails(input: { id: string; title: string; description: string | null; eventDate: string | null; now: string }): number {
        return this.database.connection
            .prepare(
                `UPDATE galleries
         SET title = ?, description = ?, event_date = ?, updated_at = ?
         WHERE id = ?`,
            )
            .run(input.title, input.description, input.eventDate, input.now, input.id).changes
    }

    countPhotos(id: string): number {
        const row = this.database.connection.prepare('SELECT COUNT(*) AS count FROM photos WHERE gallery_id = ?').get(id) as {
            count: number
        }
        return row.count
    }

    delete(id: string): number {
        return this.database.connection.prepare('DELETE FROM galleries WHERE id = ?').run(id).changes
    }

    slugExists(slug: string): boolean {
        return Boolean(this.database.connection.prepare('SELECT 1 FROM galleries WHERE slug = ?').get(slug))
    }

    setCover(id: string, photoId: string | null, now: string): number {
        return this.database.connection
            .prepare(
                `UPDATE galleries
         SET cover_photo_id = ?, updated_at = ?
         WHERE id = ?`,
            )
            .run(photoId, now, id).changes
    }

    getPublishedBySlug(slug: string): GalleryRecord | undefined {
        return this.database.connection.prepare("SELECT * FROM galleries WHERE slug = ? AND status = 'published'").get(slug) as
            GalleryRecord | undefined
    }

    publish(id: string, shareToken: string, shareTokenHash: string, now: string): number {
        return this.database.connection
            .prepare(
                `UPDATE galleries
         SET status = 'published', share_token = ?, share_token_hash = ?, published_at = ?, updated_at = ?
         WHERE id = ? AND status = 'draft'`,
            )
            .run(shareToken, shareTokenHash, now, now, id).changes
    }

    rotateShareToken(id: string, shareToken: string, shareTokenHash: string, now: string): number {
        return this.database.connection
            .prepare(
                `UPDATE galleries
         SET share_token = ?, share_token_hash = ?, published_at = COALESCE(published_at, ?), updated_at = ?
         WHERE id = ? AND status = 'published'`,
            )
            .run(shareToken, shareTokenHash, now, now, id).changes
    }

    unpublish(id: string, now: string): number {
        return this.database.connection
            .prepare(
                `UPDATE galleries
         SET status = 'draft', published_at = NULL, updated_at = ?
         WHERE id = ? AND status = 'published'`,
            )
            .run(now, id).changes
    }

    revokeVisitorSessions(galleryId: string, now: string): void {
        this.database.connection
            .prepare('UPDATE visitor_sessions SET revoked_at = ? WHERE gallery_id = ? AND revoked_at IS NULL')
            .run(now, galleryId)
    }
}
