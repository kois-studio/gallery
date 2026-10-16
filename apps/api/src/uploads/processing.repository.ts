import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import type { PhotoRecord } from './photo.repository.js'

export interface ProcessingWork extends PhotoRecord {
    attempts: number
}

const maximumAttempts = 3

@Injectable()
export class ProcessingRepository {
    constructor(private readonly database: DatabaseService) {}

    requeueInterrupted(now: string): number {
        const recover = this.database.connection.transaction(() => {
            const jobs = this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET status = 'queued', available_at = ?, claimed_at = NULL, updated_at = ?
           WHERE status = 'processing' AND cancelled_at IS NULL`,
                )
                .run(now, now).changes
            this.database.connection
                .prepare(
                    `UPDATE photos
           SET processing_status = 'pending', updated_at = ?
           WHERE processing_status = 'processing' AND cancelled_at IS NULL`,
                )
                .run(now)
            return jobs
        })

        return recover()
    }

    claimNext(now: string): ProcessingWork | undefined {
        const claim = this.database.connection.transaction(() => {
            const work = this.database.connection
                .prepare(
                    `SELECT p.*, j.attempts
           FROM photos p
           INNER JOIN processing_jobs j ON j.photo_id = p.id
           WHERE j.status = 'queued' AND j.cancelled_at IS NULL
             AND p.cancelled_at IS NULL AND j.available_at <= ?
           ORDER BY j.available_at ASC, j.created_at ASC
           LIMIT 1`,
                )
                .get(now) as ProcessingWork | undefined

            if (!work) {
                return undefined
            }

            this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET status = 'processing', attempts = attempts + 1, claimed_at = ?, updated_at = ?
           WHERE photo_id = ? AND status = 'queued' AND cancelled_at IS NULL`,
                )
                .run(now, now, work.id)
            this.database.connection
                .prepare("UPDATE photos SET processing_status = 'processing', updated_at = ? WHERE id = ? AND cancelled_at IS NULL")
                .run(now, work.id)

            return { ...work, attempts: work.attempts + 1 }
        })

        return claim()
    }

    markComplete(input: {
        photoId: string
        thumbnailKey: string
        displayKey: string
        width: number
        height: number
        capturedAt: string | null
        now: string
    }): boolean {
        const complete = this.database.connection.transaction(() => {
            const photoUpdate = this.database.connection
                .prepare(
                    `UPDATE photos
           SET thumbnail_key = ?, display_key = ?, width = ?, height = ?, captured_at = ?,
               processing_status = 'ready', processing_error = NULL, updated_at = ?
           WHERE id = ? AND processing_status = 'processing' AND cancelled_at IS NULL`,
                )
                .run(input.thumbnailKey, input.displayKey, input.width, input.height, input.capturedAt, input.now, input.photoId)
            if (photoUpdate.changes === 0) {
                return false
            }
            this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET status = 'complete', claimed_at = NULL, last_error = NULL, updated_at = ?
           WHERE photo_id = ? AND status = 'processing' AND cancelled_at IS NULL`,
                )
                .run(input.now, input.photoId)
            return true
        })

        return complete()
    }

    markFailed(photoId: string, attempts: number, error: string, now: string): void {
        const terminal = attempts >= maximumAttempts
        const retryAt = new Date(Date.now() + 2 ** attempts * 1000).toISOString()
        const fail = this.database.connection.transaction(() => {
            this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET status = ?, available_at = ?, claimed_at = NULL, last_error = ?, updated_at = ?
           WHERE photo_id = ? AND cancelled_at IS NULL`,
                )
                .run(terminal ? 'failed' : 'queued', terminal ? now : retryAt, error, now, photoId)
            this.database.connection
                .prepare(
                    `UPDATE photos
           SET processing_status = ?, processing_error = ?, updated_at = ?
           WHERE id = ? AND cancelled_at IS NULL`,
                )
                .run(terminal ? 'failed' : 'pending', error, now, photoId)
        })

        fail()
    }

    retry(photoId: string, now: string): boolean {
        const retry = this.database.connection.transaction(() => {
            const photoUpdate = this.database.connection
                .prepare(
                    `UPDATE photos
           SET processing_status = 'pending', processing_error = NULL, updated_at = ?
           WHERE id = ? AND processing_status = 'failed' AND cancelled_at IS NULL`,
                )
                .run(now, photoId)
            if (photoUpdate.changes === 0) {
                return false
            }
            this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET status = 'queued', attempts = 0, available_at = ?, claimed_at = NULL, last_error = NULL, updated_at = ?
           WHERE photo_id = ? AND cancelled_at IS NULL`,
                )
                .run(now, now, photoId)
            return true
        })

        return retry()
    }

    isCancelled(photoId: string): boolean {
        const row = this.database.connection.prepare('SELECT cancelled_at FROM photos WHERE id = ?').get(photoId) as
            { cancelled_at: string | null } | undefined
        return Boolean(row?.cancelled_at)
    }

    cancel(photoId: string, now: string): boolean {
        const cancel = this.database.connection.transaction(() => {
            const photo = this.database.connection
                .prepare(
                    `SELECT processing_status, cancelled_at
           FROM photos
           WHERE id = ?`,
                )
                .get(photoId) as { processing_status: string; cancelled_at: string | null } | undefined
            if (!photo || photo.cancelled_at || !['pending', 'processing'].includes(photo.processing_status)) {
                return false
            }

            this.database.connection
                .prepare(
                    `UPDATE photos
           SET processing_status = 'failed', processing_error = 'Cancelled by administrator', cancelled_at = ?, updated_at = ?
           WHERE id = ? AND cancelled_at IS NULL`,
                )
                .run(now, now, photoId)
            this.database.connection
                .prepare(
                    `UPDATE processing_jobs
           SET cancelled_at = ?, claimed_at = NULL, last_error = 'Cancelled by administrator', updated_at = ?
           WHERE photo_id = ? AND cancelled_at IS NULL`,
                )
                .run(now, now, photoId)
            return true
        })

        return cancel()
    }
}
