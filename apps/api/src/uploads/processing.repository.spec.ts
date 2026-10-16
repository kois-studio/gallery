import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from '../database/migration-runner.js'
import { ProcessingRepository } from './processing.repository.js'

describe('ProcessingRepository', () => {
    it('requeues jobs left processing by an interrupted process', () => {
        const database = new Database(':memory:')
        database.pragma('foreign_keys = ON')
        runMigrations(database)
        database
            .prepare(
                `INSERT INTO galleries (id, slug, title, created_at, updated_at)
         VALUES ('gallery', 'gallery', 'Gallery', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO photos
          (id, gallery_id, original_name, original_key, mime_type, original_bytes,
           processing_status, created_at, updated_at)
         VALUES ('photo', 'gallery', 'photo.jpg', 'original/photo.jpg', 'image/jpeg', 1,
           'processing', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, claimed_at, created_at, updated_at)
         VALUES ('job', 'photo', 'processing', 1, 'future', 'now', 'now', 'now')`,
            )
            .run()

        const service = new ProcessingRepository({ connection: database } as never)
        expect(service.requeueInterrupted('recovered')).toBe(1)
        expect(database.prepare('SELECT status, available_at FROM processing_jobs').get()).toEqual({
            status: 'queued',
            available_at: 'recovered',
        })
        expect(database.prepare('SELECT processing_status FROM photos').get()).toEqual({
            processing_status: 'pending',
        })
        database.close()
    })

    it('cancels queued work durably and prevents a later claim or completion', () => {
        const database = new Database(':memory:')
        database.pragma('foreign_keys = ON')
        runMigrations(database)
        database
            .prepare(
                `INSERT INTO galleries (id, slug, title, created_at, updated_at)
         VALUES ('gallery', 'gallery', 'Gallery', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO photos
          (id, gallery_id, original_name, original_key, mime_type, original_bytes,
           processing_status, created_at, updated_at)
         VALUES ('photo', 'gallery', 'photo.jpg', 'original/photo.jpg', 'image/jpeg', 1,
           'pending', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES ('job', 'photo', 'queued', 0, 'now', 'now', 'now')`,
            )
            .run()

        const service = new ProcessingRepository({ connection: database } as never)
        expect(service.cancel('photo', 'cancelled')).toBe(true)
        expect(service.claimNext('later')).toBeUndefined()
        expect(
            service.markComplete({
                photoId: 'photo',
                thumbnailKey: 'thumb',
                displayKey: 'display',
                width: 1,
                height: 1,
                capturedAt: null,
                now: 'later',
            }),
        ).toBe(false)
        expect(database.prepare('SELECT processing_status, processing_error, cancelled_at FROM photos').get()).toEqual({
            processing_status: 'failed',
            processing_error: 'Cancelled by administrator',
            cancelled_at: 'cancelled',
        })
        expect(database.prepare('SELECT status, cancelled_at, last_error FROM processing_jobs').get()).toEqual({
            status: 'queued',
            cancelled_at: 'cancelled',
            last_error: 'Cancelled by administrator',
        })
        database.close()
    })

    it('retries processing failures and terminally fails after the maximum attempts', () => {
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
         VALUES ('photo', 'gallery', 'photo.jpg', 'original/photo.jpg', 'image/jpeg', 1,
           'pending', 'now', 'now')`,
            )
            .run()
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES ('job', 'photo', 'queued', 0, 'now', 'now', 'now')`,
            )
            .run()

        const service = new ProcessingRepository({ connection: database } as never)
        expect(service.claimNext('now')?.attempts).toBe(1)
        service.markFailed('photo', 1, 'synthetic processing failure', 'failed-once')
        expect(database.prepare('SELECT status, attempts, last_error FROM processing_jobs').get()).toMatchObject({
            status: 'queued',
            attempts: 1,
            last_error: 'synthetic processing failure',
        })
        expect(database.prepare('SELECT processing_status, processing_error FROM photos').get()).toEqual({
            processing_status: 'pending',
            processing_error: 'synthetic processing failure',
        })

        database.prepare("UPDATE processing_jobs SET available_at = 'now'").run()
        expect(service.claimNext('now')?.attempts).toBe(2)
        service.markFailed('photo', 2, 'second processing failure', 'failed-twice')
        database.prepare("UPDATE processing_jobs SET available_at = 'now'").run()
        expect(service.claimNext('now')?.attempts).toBe(3)
        service.markFailed('photo', 3, 'terminal processing failure', 'failed-terminal')
        expect(database.prepare('SELECT status, attempts, last_error FROM processing_jobs').get()).toMatchObject({
            status: 'failed',
            attempts: 3,
            last_error: 'terminal processing failure',
        })
        expect(database.prepare('SELECT processing_status, processing_error FROM photos').get()).toEqual({
            processing_status: 'failed',
            processing_error: 'terminal processing failure',
        })
        database.close()
    })
})
