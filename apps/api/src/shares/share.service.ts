import { ForbiddenException, Injectable } from '@nestjs/common'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { DatabaseService } from '../database/database.service.js'
import { GalleryRepository } from '../galleries/gallery.repository.js'
import { hashToken } from '../auth/auth.service.js'
import type { VisitorSession, VisitorSessionGrant } from './share.types.js'

const visitorSessionLifetimeMs = 24 * 60 * 60 * 1000

interface VisitorSessionRow {
    id: string
    gallery_id: string
    slug: string
    expires_at: string
}

@Injectable()
export class ShareService {
    constructor(
        private readonly database: DatabaseService,
        private readonly galleries: GalleryRepository,
    ) {}

    exchange(slug: string, shareToken: string): VisitorSessionGrant {
        const gallery = this.galleries.getPublishedBySlug(slug)
        if (!gallery || !gallery.share_token_hash || !safeEqualToken(hashToken(shareToken), gallery.share_token_hash)) {
            throw new ForbiddenException('Invalid or revoked gallery link')
        }

        const createdAt = new Date()
        const expiresAt = new Date(createdAt.getTime() + visitorSessionLifetimeMs).toISOString()
        const sessionToken = randomBytes(32).toString('base64url')
        const session: VisitorSession = {
            id: randomUUID(),
            galleryId: gallery.id,
            slug: gallery.slug,
            expiresAt,
        }

        this.database.connection
            .prepare(
                `INSERT INTO visitor_sessions
          (id, gallery_id, token_hash, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
            )
            .run(session.id, session.galleryId, hashToken(sessionToken), createdAt.toISOString(), expiresAt)

        return { session, cookieValue: `${session.id}:${sessionToken}` }
    }

    validateVisitorSession(sessionCookie: string | undefined): VisitorSession | undefined {
        if (!sessionCookie) {
            return undefined
        }

        const separator = sessionCookie.indexOf(':')
        if (separator < 1) {
            return undefined
        }
        const sessionId = sessionCookie.slice(0, separator)
        const sessionToken = sessionCookie.slice(separator + 1)
        const row = this.database.connection
            .prepare(
                `SELECT vs.id, vs.gallery_id, g.slug, vs.expires_at
         FROM visitor_sessions vs
         INNER JOIN galleries g ON g.id = vs.gallery_id
         WHERE vs.id = ? AND vs.token_hash = ? AND vs.revoked_at IS NULL
           AND g.status = 'published'`,
            )
            .get(sessionId, hashToken(sessionToken)) as VisitorSessionRow | undefined

        if (!row) {
            return undefined
        }
        if (Date.parse(row.expires_at) <= Date.now()) {
            this.revoke(row.id)
            return undefined
        }

        return {
            id: row.id,
            galleryId: row.gallery_id,
            slug: row.slug,
            expiresAt: row.expires_at,
        }
    }

    revoke(sessionId: string): void {
        this.database.connection
            .prepare('UPDATE visitor_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
            .run(new Date().toISOString(), sessionId)
    }

    requireGallerySession(session: VisitorSession | undefined, slug: string): VisitorSession {
        if (!session || session.slug !== slug) {
            throw new ForbiddenException('Gallery access is not authorized')
        }
        return session
    }
}

function safeEqualToken(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
