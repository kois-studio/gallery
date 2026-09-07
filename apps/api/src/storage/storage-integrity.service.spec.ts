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
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES ('photo', 'photo', 'complete', 3, 'now', 'now', 'now')`,
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
            expect(service.repair(await service.inspect(), 'repair')).toEqual({ requeuedPhotos: ['photo'], failedPhotos: [] })
            expect(database.prepare('SELECT processing_status, thumbnail_key, display_key FROM photos').get()).toEqual({
                processing_status: 'pending',
                thumbnail_key: null,
                display_key: null,
            })
            expect(database.prepare('SELECT status, attempts, available_at FROM processing_jobs').get()).toEqual({
                status: 'queued',
                attempts: 0,
                available_at: 'repair',
            })
        } finally {
            database.close()
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('marks a photo with a missing original as failed without deleting files', () => {
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
          (id, gallery_id, original_name, original_key, mime_type, original_bytes,
           processing_status, created_at, updated_at)
         VALUES ('missing', 'gallery', 'missing.jpg', 'galleries/gallery/original/missing.jpg', 'image/jpeg', 1,
           'ready', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES ('missing', 'missing', 'complete', 1, 'now', 'now', 'now')`,
            )
            .run()

        const storageRoot = mkdtempSync(join(tmpdir(), 'gallery-integrity-missing-'))
        const storage = new LocalStorageService({ get: vi.fn().mockReturnValue(storageRoot) } as unknown as ConfigService)
        try {
            const service = new StorageIntegrityService({ connection: database } as never, storage)
            expect(
                service.repair(
                    {
                        checkedPhotos: 1,
                        referencedObjects: 1,
                        presentObjects: 0,
                        missingOriginals: ['missing'],
                        missingDerivatives: [],
                        unreferencedObjects: [],
                    },
                    'repair',
                ),
            ).toEqual({ requeuedPhotos: [], failedPhotos: ['missing'] })
            expect(database.prepare('SELECT processing_status, processing_error FROM photos').get()).toEqual({
                processing_status: 'failed',
                processing_error: 'Original object missing during storage integrity check',
            })
            expect(database.prepare('SELECT status, last_error FROM processing_jobs').get()).toEqual({
                status: 'failed',
                last_error: 'Original object missing during storage integrity check',
            })
        } finally {
            database.close()
            rmSync(storageRoot, { recursive: true, force: true })
        }
    })
})
