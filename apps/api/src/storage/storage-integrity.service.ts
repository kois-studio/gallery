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
}
