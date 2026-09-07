import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'
import { LocalStorageService } from './storage.service.js'

export interface StorageIntegrityReport {
    checkedPhotos: number
    referencedObjects: number
    presentObjects: number
    missingOriginals: string[]
    missingDerivatives: Array<{ photoId: string; variant: 'thumbnail' | 'display'; key: string }>
    unreferencedObjects: string[]
}

export interface StorageRepairResult {
    requeuedPhotos: string[]
    failedPhotos: string[]
}

interface PhotoStorageRow {
    id: string
    original_key: string
    thumbnail_key: string | null
    display_key: string | null
    processing_status: string
    cancelled_at: string | null
}

@Injectable()
export class StorageIntegrityService {
    constructor(
        private readonly database: DatabaseService,
        private readonly storage: LocalStorageService,
    ) {}

    async inspect(): Promise<StorageIntegrityReport> {
        const photos = this.database.connection
            .prepare('SELECT id, original_key, thumbnail_key, display_key, processing_status, cancelled_at FROM photos')
            .all() as PhotoStorageRow[]
        const references = new Set<string>()
        const missingOriginals: string[] = []
        const missingDerivatives: StorageIntegrityReport['missingDerivatives'] = []

        for (const photo of photos) {
            if (photo.cancelled_at) {
                continue
            }

            references.add(photo.original_key)
            if (!(await this.storage.hasObject(photo.original_key))) {
                missingOriginals.push(photo.id)
                continue
            }

            if (photo.processing_status !== 'ready') {
                continue
            }

            for (const [variant, key] of [
                ['thumbnail', photo.thumbnail_key],
                ['display', photo.display_key],
            ] as const) {
                if (!key) {
                    missingDerivatives.push({ photoId: photo.id, variant, key: '(missing key)' })
                    continue
                }
                references.add(key)
                if (!(await this.storage.hasObject(key))) {
                    missingDerivatives.push({ photoId: photo.id, variant, key })
                }
            }
        }

        const objectKeys = await this.storage.listObjectKeys()
        const unreferencedObjects = objectKeys.filter(key => !references.has(key)).sort()

        return {
            checkedPhotos: photos.length,
            referencedObjects: references.size,
            presentObjects: Math.max(0, objectKeys.length - unreferencedObjects.length),
            missingOriginals: missingOriginals.sort(),
            missingDerivatives,
            unreferencedObjects,
        }
    }

    static hasProblems(report: StorageIntegrityReport): boolean {
        return report.missingOriginals.length > 0 || report.missingDerivatives.length > 0 || report.unreferencedObjects.length > 0
    }

    repair(report: StorageIntegrityReport, now = new Date().toISOString()): StorageRepairResult {
        const missingOriginals = new Set(report.missingOriginals)
        const requeuePhotos = [...new Set(report.missingDerivatives.map(derivative => derivative.photoId))].filter(
            photoId => !missingOriginals.has(photoId),
        )
        const repair = this.database.connection.transaction(() => {
            const failOriginal = this.database.connection.prepare(
                `UPDATE photos
           SET processing_status = 'failed', processing_error = 'Original object missing during storage integrity check', updated_at = ?
           WHERE id = ? AND cancelled_at IS NULL`,
            )
            const failJob = this.database.connection.prepare(
                `UPDATE processing_jobs
           SET status = 'failed', claimed_at = NULL, last_error = 'Original object missing during storage integrity check', updated_at = ?
           WHERE photo_id = ? AND cancelled_at IS NULL`,
            )
            const resetPhoto = this.database.connection.prepare(
                `UPDATE photos
           SET thumbnail_key = NULL, display_key = NULL, width = NULL, height = NULL,
               processing_status = 'pending', processing_error = 'Derivative missing during storage integrity check', updated_at = ?
           WHERE id = ? AND cancelled_at IS NULL`,
            )
            const resetJob = this.database.connection.prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES (?, ?, 'queued', 0, ?, ?, ?)
         ON CONFLICT(photo_id) DO UPDATE SET
           status = 'queued', attempts = 0, available_at = ?, claimed_at = NULL,
           last_error = NULL, cancelled_at = NULL, updated_at = ?`,
            )

            for (const photoId of missingOriginals) {
                failOriginal.run(now, photoId)
                failJob.run(now, photoId)
            }
            for (const photoId of requeuePhotos) {
                resetPhoto.run(now, photoId)
                resetJob.run(photoId, photoId, now, now, now, now, now)
            }
        })

        repair()
        return { requeuedPhotos: requeuePhotos, failedPhotos: [...missingOriginals] }
    }
}
