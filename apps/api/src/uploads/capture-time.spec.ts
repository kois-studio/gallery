import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { readCaptureTime } from './capture-time.js'

async function exifFor(exif: Record<string, Record<string, string>>): Promise<Buffer | undefined> {
    const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#808080' } })
        .jpeg()
        .withExif(exif)
        .toBuffer()
    return (await sharp(image).metadata()).exif
}

describe('readCaptureTime', () => {
    it('reads DateTimeOriginal instead of the IFD0 modification time', async () => {
        const exif = await exifFor({
            IFD0: { DateTime: '2026:10:01 20:00:00' },
            IFD2: { DateTimeOriginal: '2024:06:15 14:03:09' },
        })

        expect(readCaptureTime(exif)).toBe('2024-06-15T14:03:09')
    })

    it('returns null when no capture time is present', async () => {
        expect(readCaptureTime(await exifFor({ IFD0: { DateTime: '2026:10:01 20:00:00' } }))).toBeNull()
        expect(readCaptureTime(undefined)).toBeNull()
    })

    it('returns null for malformed or placeholder data', async () => {
        expect(readCaptureTime(Buffer.from('Exif\0\0not a tiff header'))).toBeNull()
        expect(readCaptureTime(Buffer.alloc(3))).toBeNull()
        expect(readCaptureTime(await exifFor({ IFD2: { DateTimeOriginal: '0000:00:00 00:00:00' } }))).toBeNull()
    })
})
