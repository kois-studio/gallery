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
})
