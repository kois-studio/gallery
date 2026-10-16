import sharp from 'sharp'

export interface MediaFixture {
    buffer: Buffer
    filename: string
}

export interface MediaFixtureSet {
    supported: MediaFixture[]
    rejected: MediaFixture[]
}

export async function createMediaFixtures(): Promise<MediaFixtureSet> {
    const jpeg = await sharp({
        create: {
            width: 64,
            height: 48,
            channels: 3,
            background: { r: 28, g: 74, b: 96 },
        },
    })
        .jpeg({ quality: 82 })
        .toBuffer()

    const png = await sharp({
        create: {
            width: 64,
            height: 48,
            channels: 4,
            background: { r: 218, g: 176, b: 92, alpha: 0.65 },
        },
    })
        .png()
        .toBuffer()

    const webp = await sharp({
        create: {
            width: 64,
            height: 48,
            channels: 3,
            background: { r: 132, g: 64, b: 104 },
        },
    })
        .webp({ quality: 82 })
        .toBuffer()

    const rotatedJpeg = await sharp({
        create: {
            width: 48,
            height: 64,
            channels: 3,
            background: { r: 76, g: 126, b: 82 },
        },
    })
        .withMetadata({ orientation: 6 })
        .jpeg({ quality: 82 })
        .toBuffer()

    return {
        supported: [
            { buffer: jpeg, filename: 'fixture-jpeg.jpg' },
            { buffer: png, filename: 'fixture-transparent.png' },
            { buffer: webp, filename: 'fixture-webp.webp' },
            { buffer: rotatedJpeg, filename: 'fixture-exif-rotated.jpg' },
        ],
        rejected: [
            { buffer: Buffer.from('not an image'), filename: 'fixture-malformed.jpg' },
            { buffer: Buffer.alloc(0), filename: 'fixture-empty.webp' },
            { buffer: Buffer.from('GIF89a'), filename: 'fixture-unsupported.gif' },
        ],
    }
}
