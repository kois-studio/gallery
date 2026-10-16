const exifIfdPointerTag = 0x8769
const dateTimeOriginalTag = 0x9003
const asciiType = 2
const longType = 4
const exifDatePattern = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/

/**
 * Reads EXIF DateTimeOriginal from the EXIF block returned by Sharp metadata.
 * Returns a local, timezone-less `YYYY-MM-DDTHH:MM:SS` string so photos from
 * one camera sort chronologically, or null when the value is absent or invalid.
 */
export function readCaptureTime(exif: Buffer | undefined): string | null {
    if (!exif) {
        return null
    }

    try {
        const tiff = exif.subarray(0, 6).toString('binary') === 'Exif\0\0' ? exif.subarray(6) : exif
        const byteOrder = tiff.subarray(0, 2).toString('ascii')
        if (byteOrder !== 'II' && byteOrder !== 'MM') {
            return null
        }
        const littleEndian = byteOrder === 'II'
        const readShort = (offset: number) => (littleEndian ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset))
        const readLong = (offset: number) => (littleEndian ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset))
        if (readShort(2) !== 42) {
            return null
        }

        const findEntry = (ifdOffset: number, tag: number): { type: number; count: number; valueOffset: number } | undefined => {
            const entries = readShort(ifdOffset)
            for (let index = 0; index < entries; index += 1) {
                const entry = ifdOffset + 2 + index * 12
                if (readShort(entry) === tag) {
                    return { type: readShort(entry + 2), count: readLong(entry + 4), valueOffset: entry + 8 }
                }
            }
            return undefined
        }

        const exifPointer = findEntry(readLong(4), exifIfdPointerTag)
        if (!exifPointer || exifPointer.type !== longType) {
            return null
        }
        const original = findEntry(readLong(exifPointer.valueOffset), dateTimeOriginalTag)
        if (!original || original.type !== asciiType || original.count < 19) {
            return null
        }

        const valueStart = original.count > 4 ? readLong(original.valueOffset) : original.valueOffset
        const match = exifDatePattern.exec(tiff.subarray(valueStart, valueStart + 19).toString('ascii'))
        if (!match) {
            return null
        }
        const [, year, month, day, hour, minute, second] = match
        if (year === '0000' || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) {
            return null
        }
        return `${year}-${month}-${day}T${hour}:${minute}:${second}`
    } catch {
        return null
    }
}
