import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { ProcessingWorker } from './processing.worker.js'
import type { ProcessingWork } from './processing.repository.js'

describe('ProcessingWorker', () => {
    it('cleans partial derivatives when storage fails during processing', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'gallery-processing-worker-'))
        const originalPath = join(directory, 'original.jpg')
        await sharp({
            create: {
                width: 4,
                height: 4,
                channels: 3,
                background: { r: 80, g: 100, b: 120 },
            },
        })
            .jpeg()
            .toFile(originalPath)

        const jobs = {
            isCancelled: vi.fn().mockReturnValue(false),
            markComplete: vi.fn(),
            markFailed: vi.fn(),
        }
        const storage = {
            pathForRead: vi.fn().mockResolvedValue(originalPath),
            writeAtomically: vi.fn().mockImplementation(async (key: string) => {
                if (key.includes('/thumbnail/')) {
                    throw new Error('Synthetic storage-full failure')
                }
            }),
            remove: vi.fn().mockResolvedValue(undefined),
        }
        const worker = new ProcessingWorker(jobs as never, storage as never)
        const work = {
            id: 'photo',
            gallery_id: 'gallery',
            original_name: 'photo.jpg',
            original_key: 'galleries/gallery/original/photo.jpg',
            thumbnail_key: null,
            display_key: null,
            mime_type: 'image/jpeg',
            original_bytes: 1,
            width: null,
            height: null,
            position: 0,
            processing_status: 'processing',
            processing_error: null,
            cancelled_at: null,
            created_at: 'now',
            updated_at: 'now',
            attempts: 1,
        } satisfies ProcessingWork

        try {
            await (worker as unknown as { process(input: ProcessingWork): Promise<void> }).process(work)

            expect(jobs.markFailed).toHaveBeenCalledWith('photo', 1, 'Synthetic storage-full failure', expect.any(String))
            expect(storage.remove).toHaveBeenCalledWith('galleries/gallery/display/photo.webp')
            expect(storage.remove).toHaveBeenCalledWith('galleries/gallery/thumbnail/photo.webp')
            expect(jobs.markComplete).not.toHaveBeenCalled()
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })
})
