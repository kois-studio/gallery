import Database from 'better-sqlite3'
import { ConfigService } from '@nestjs/config'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runMigrations } from '../database/migration-runner.js'
import { StorageIntegrityService } from './storage-integrity.service.js'
import { LocalStorageService } from './storage.service.js'

describe('StorageIntegrityService', () => {
    it('reports missing originals, missing ready derivatives, and extra files', async () => {
        const database = new Database(':memory:')
        database.pragma('foreign_keys = ON')
        runMigrations(database)
        database
            .prepare(
                `INSERT INTO galleries (id, slug, title, created_at, updated_at) VALUES ('gallery', 'gallery', 'Gallery', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO photos
          (id, gallery_id, original_name, original_key, thumbnail_key, display_key, mime_type, original_bytes,
           width, height, processing_status, created_at, updated_at)
         VALUES ('photo', 'gallery', 'photo.jpg', 'galleries/gallery/original/photo.jpg',
           'galleries/gallery/thumbnail/photo.webp', 'galleries/gallery/display/photo.webp', 'image/jpeg', 1,
           1, 1, 'ready', 'now', 'now')`,
            )
            .run()

        const root = mkdtempSync(join(tmpdir(), 'gallery-integrity-'))
        const storage = new LocalStorageService({ get: vi.fn().mockReturnValue(root) } as unknown as ConfigService)
        await storage.writeAtomically('galleries/gallery/original/photo.jpg', Buffer.from('original'))
        await storage.writeAtomically('galleries/gallery/display/photo.webp', Buffer.from('display'))
        await storage.writeAtomically('galleries/gallery/extra.webp', Buffer.from('extra'))

        try {
            const service = new StorageIntegrityService({ connection: database } as never, storage)
            await expect(service.inspect()).resolves.toEqual({
                checkedPhotos: 1,
                referencedObjects: 3,
                presentObjects: 2,
                missingOriginals: [],
                missingDerivatives: [{ photoId: 'photo', variant: 'thumbnail', key: 'galleries/gallery/thumbnail/photo.webp' }],
                unreferencedObjects: ['galleries/gallery/extra.webp'],
            })
        } finally {
            database.close()
            rmSync(root, { recursive: true, force: true })
        }
    })
})
