import { ConfigService } from '@nestjs/config'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LocalStorageService } from './storage.service.js'

describe('LocalStorageService', () => {
    it('writes atomically under the configured root and rejects traversal', async () => {
        const root = mkdtempSync(join(tmpdir(), 'gallery-storage-'))
        const config = { get: vi.fn().mockReturnValue(root) } as unknown as ConfigService
        const storage = new LocalStorageService(config)

        try {
            await storage.writeAtomically('gallery/photo/original.jpg', Buffer.from('original'))
            expect(readFileSync(join(root, 'gallery/photo/original.jpg'), 'utf8')).toBe('original')
            expect(() => storage.pathForKey('../outside.jpg')).toThrow()
            expect(() => storage.pathForKey('/outside.jpg')).toThrow()
            expect(() => storage.pathForKey('gallery/../outside.jpg')).toThrow()
            expect(() => storage.pathForKey('gallery\\outside.jpg')).toThrow()

            mkdirSync(join(root, 'linked'), { recursive: true })
            symlinkSync(join(root, 'linked'), join(root, 'gallery', 'escape'))
            await expect(storage.writeAtomically('gallery/escape/file.jpg', Buffer.from('unsafe'))).rejects.toThrow('symbolic links')
        } finally {
            rmSync(root, { recursive: true, force: true })
        }
    })

    it('removes only stale upload temporary files', async () => {
        const root = mkdtempSync(join(tmpdir(), 'gallery-storage-cleanup-'))
        const config = { get: vi.fn().mockReturnValue(root) } as unknown as ConfigService
        const storage = new LocalStorageService(config)
        const temporaryDirectory = join(root, '.tmp', 'uploads')
        mkdirSync(temporaryDirectory, { recursive: true })
        const stale = join(temporaryDirectory, 'stale-upload')
        const current = join(temporaryDirectory, 'current-upload')
        writeFileSync(stale, 'stale')
        writeFileSync(current, 'current')
        const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        utimesSync(stale, old, old)

        try {
            expect(await storage.cleanupTemporaryUploads()).toBe(1)
            expect(() => readFileSync(stale)).toThrow()
            expect(readFileSync(current, 'utf8')).toBe('current')
        } finally {
            rmSync(root, { recursive: true, force: true })
        }
    })
})
