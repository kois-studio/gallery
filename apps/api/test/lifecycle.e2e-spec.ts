import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import request from 'supertest'
import { App } from 'supertest/types'
import { DatabaseService } from '../src/database/database.service.js'

type Agent = ReturnType<typeof request.agent>
interface PhotoStatus {
    photoId: string
    originalName: string
    status: string
    width: number | null
    height: number | null
    capturedAt: string | null
}

describe('gallery lifecycle (e2e)', () => {
    let app: INestApplication<App>
    let dataDirectory: string
    let admin: Agent
    let csrfToken: string
    const password = 'correct horse battery staple'
    const setupToken = 'lifecycle-gallery-test-setup-token-with-at-least-32-characters'

    beforeAll(async () => {
        dataDirectory = mkdtempSync(join(tmpdir(), 'gallery-lifecycle-'))
        process.env.NODE_ENV = 'test'
        process.env.DATABASE_PATH = join(dataDirectory, 'gallery.db')
        process.env.STORAGE_PATH = join(dataDirectory, 'photos')
        process.env.SETUP_TOKEN = setupToken

        const { AppModule } = await import('./../src/app.module.js')
        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()
        app = moduleFixture.createNestApplication()
        await app.init()

        admin = request.agent(app.getHttpServer())
        const setup = await admin.post('/api/auth/setup').set('X-Setup-Token', setupToken).send({ password }).expect(201)
        csrfToken = setup.body.csrfToken
    })

    afterAll(async () => {
        await app.close()
        delete process.env.SETUP_TOKEN
        delete process.env.DATABASE_PATH
        delete process.env.STORAGE_PATH
        rmSync(dataDirectory, { recursive: true, force: true })
    })

    async function createGallery(title: string): Promise<string> {
        const gallery = await admin.post('/api/admin/galleries').set('X-CSRF-Token', csrfToken).send({ title }).expect(201)
        return gallery.body.id as string
    }

    async function image(options: { width?: number; height?: number; capturedAt?: string; orientation?: number } = {}): Promise<Buffer> {
        let pipeline = sharp({
            create: { width: options.width ?? 40, height: options.height ?? 20, channels: 3, background: '#4b6b8a' },
        }).jpeg()
        if (options.capturedAt) {
            pipeline = pipeline.withExif({ IFD2: { DateTimeOriginal: options.capturedAt } })
        }
        if (options.orientation) {
            pipeline = pipeline.withMetadata({ orientation: options.orientation })
        }
        return pipeline.toBuffer()
    }

    async function upload(galleryId: string, files: Array<{ name: string; buffer: Buffer }>): Promise<void> {
        let uploadRequest = admin.post(`/api/admin/galleries/${galleryId}/photos`).set('X-CSRF-Token', csrfToken)
        for (const file of files) {
            uploadRequest = uploadRequest.attach('files', file.buffer, file.name)
        }
        await uploadRequest.expect(201)
    }

    async function settledPhotos(galleryId: string): Promise<PhotoStatus[]> {
        for (let attempt = 0; attempt < 60; attempt += 1) {
            const response = await admin.get(`/api/admin/galleries/${galleryId}/photos`).expect(200)
            const files = response.body.files as PhotoStatus[]
            if (files.every(file => !['pending', 'processing'].includes(file.status))) {
                return files
            }
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        throw new Error('Processing did not settle')
    }

    async function publishWithCover(galleryId: string, coverId: string): Promise<string> {
        await admin.patch(`/api/admin/galleries/${galleryId}/cover`).set('X-CSRF-Token', csrfToken).send({ photoId: coverId }).expect(200)
        const published = await admin.post(`/api/admin/galleries/${galleryId}/publish`).set('X-CSRF-Token', csrfToken).expect(201)
        return published.body.sharePath as string
    }

    function failPhoto(photoId: string): void {
        // Simulates a photo that exhausted its processing attempts.
        app.get(DatabaseService)
            .connection.prepare("UPDATE photos SET processing_status = 'failed', processing_error = 'Synthetic failure' WHERE id = ?")
            .run(photoId)
        app.get(DatabaseService).connection.prepare("UPDATE processing_jobs SET status = 'failed' WHERE photo_id = ?").run(photoId)
    }

    it('orders photos by capture time and stores display-oriented dimensions', async () => {
        const galleryId = await createGallery('Capture order')
        await upload(galleryId, [
            { name: 'late.jpg', buffer: await image({ capturedAt: '2024:06:15 18:00:00' }) },
            { name: 'portrait.jpg', buffer: await image({ capturedAt: '2024:06:15 12:00:00', orientation: 6 }) },
            { name: 'no-exif.jpg', buffer: await image() },
        ])

        const photos = await settledPhotos(galleryId)
        expect(photos.map(photo => photo.originalName)).toEqual(['portrait.jpg', 'late.jpg', 'no-exif.jpg'])
        expect(photos[0]).toMatchObject({ width: 20, height: 40, capturedAt: '2024-06-15T12:00:00' })
        expect(photos[2].capturedAt).toBeNull()
    })

    it('lets failed photos be retried or deleted without blocking publication', async () => {
        const galleryId = await createGallery('Recoverable gallery')
        await upload(galleryId, [
            { name: 'good.jpg', buffer: await image() },
            { name: 'broken.jpg', buffer: await image() },
        ])
        const [good, broken] = await settledPhotos(galleryId)
        failPhoto(broken.photoId)

        await admin.post(`/api/admin/galleries/${galleryId}/photos/${good.photoId}/retry`).set('X-CSRF-Token', csrfToken).expect(409)
        await admin
            .post(`/api/admin/galleries/${galleryId}/photos/${broken.photoId}/retry`)
            .set('X-CSRF-Token', csrfToken)
            .expect(201)
            .expect(({ body }) => expect(body).toEqual({ photoId: broken.photoId, status: 'pending' }))
        expect((await settledPhotos(galleryId)).map(photo => photo.status)).toEqual(['ready', 'ready'])

        failPhoto(broken.photoId)
        const sharePath = await publishWithCover(galleryId, good.photoId)
        expect(sharePath).toMatch(/^\/g\/recoverable-gallery\//)

        await admin.delete(`/api/admin/galleries/${galleryId}/photos/${broken.photoId}`).expect(403)
        await admin.delete(`/api/admin/galleries/${galleryId}/photos/${broken.photoId}`).set('X-CSRF-Token', csrfToken).expect(204)
        await admin.delete(`/api/admin/galleries/${galleryId}/photos/${broken.photoId}`).set('X-CSRF-Token', csrfToken).expect(404)
        expect((await settledPhotos(galleryId)).map(photo => photo.photoId)).toEqual([good.photoId])
    })

    it('keeps published galleries editable and the share link stable until rotation', async () => {
        const galleryId = await createGallery('Living gallery')
        await upload(galleryId, [{ name: 'first.jpg', buffer: await image() }])
        const [first] = await settledPhotos(galleryId)
        const sharePath = await publishWithCover(galleryId, first.photoId)
        const [, , slug, token] = sharePath.split('/')

        await admin
            .get(`/api/admin/galleries/${galleryId}`)
            .expect(200)
            .expect(({ body }) => expect(body.sharePath).toBe(sharePath))
        await admin
            .patch(`/api/admin/galleries/${galleryId}`)
            .set('X-CSRF-Token', csrfToken)
            .send({ title: 'Living gallery (final)', description: 'Fixed typo' })
            .expect(200)
            .expect(({ body }) => expect(body).toMatchObject({ title: 'Living gallery (final)', status: 'published' }))

        await upload(galleryId, [{ name: 'late-arrival.jpg', buffer: await image() }])
        const [, late] = await settledPhotos(galleryId)
        await admin
            .patch(`/api/admin/galleries/${galleryId}/cover`)
            .set('X-CSRF-Token', csrfToken)
            .send({ photoId: late.photoId })
            .expect(200)

        const visitor = request.agent(app.getHttpServer())
        await visitor.post(`/api/share/${slug}/${token}/session`).expect(200)
        await visitor
            .get(`/api/shared/galleries/${slug}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body.gallery).toMatchObject({ title: 'Living gallery (final)', coverPhotoId: late.photoId })
                expect(body.photos).toHaveLength(2)
            })

        await admin.delete(`/api/admin/galleries/${galleryId}/photos/${late.photoId}`).set('X-CSRF-Token', csrfToken).expect(204)
        await admin
            .get(`/api/admin/galleries/${galleryId}`)
            .expect(200)
            .expect(({ body }) => expect(body.coverPhotoId).toBe(first.photoId))

        await admin.post(`/api/admin/galleries/${galleryId}/unpublish`).set('X-CSRF-Token', csrfToken).expect(201)
        await visitor.get(`/api/shared/galleries/${slug}`).expect(401)
        await request(app.getHttpServer()).post(`/api/share/${slug}/${token}/session`).expect(403)

        const republished = await admin.post(`/api/admin/galleries/${galleryId}/publish`).set('X-CSRF-Token', csrfToken).expect(201)
        expect(republished.body.sharePath).toBe(sharePath)
        await visitor.post(`/api/share/${slug}/${token}/session`).expect(200)
        await visitor.get(`/api/shared/galleries/${slug}`).expect(200)

        const rotated = await admin.post(`/api/admin/galleries/${galleryId}/rotate-link`).set('X-CSRF-Token', csrfToken).expect(201)
        expect(rotated.body.sharePath).not.toBe(sharePath)
        await request(app.getHttpServer()).post(`/api/share/${slug}/${token}/session`).expect(403)
    })

    it('scopes visitor access per gallery and serves resumable originals', async () => {
        const firstId = await createGallery('Visitor scope one')
        const secondId = await createGallery('Visitor scope two')
        await upload(firstId, [{ name: 'Año nuevo — “brindis”.jpg', buffer: await image() }])
        await upload(secondId, [{ name: 'two.jpg', buffer: await image() }])
        const [firstPhoto] = await settledPhotos(firstId)
        const [secondPhoto] = await settledPhotos(secondId)
        const [, , firstSlug, firstToken] = (await publishWithCover(firstId, firstPhoto.photoId)).split('/')
        const [, , secondSlug, secondToken] = (await publishWithCover(secondId, secondPhoto.photoId)).split('/')

        const visitor = request.agent(app.getHttpServer())
        const exchange = await visitor.post(`/api/share/${firstSlug}/${firstToken}/session`).expect(200)
        const cookie = exchange.headers['set-cookie'][0] as string
        expect(cookie).toContain(`Path=/api/shared/galleries/${firstSlug};`)
        expect(Number(/Max-Age=(\d+)/.exec(cookie)?.[1])).toBeLessThanOrEqual(24 * 60 * 60)

        await visitor.post(`/api/share/${secondSlug}/${secondToken}/session`).expect(200)
        await visitor.get(`/api/shared/galleries/${firstSlug}`).expect(200)
        await visitor.get(`/api/shared/galleries/${secondSlug}`).expect(200)

        const originalUrl = `/api/shared/galleries/${firstSlug}/photos/${firstPhoto.photoId}/original`
        const full = await visitor.get(originalUrl).expect(200)
        expect(full.headers['content-disposition']).toContain("filename*=UTF-8''A%C3%B1o%20nuevo")
        expect(full.headers['accept-ranges']).toBe('bytes')
        await visitor.get(originalUrl).set('Range', 'bytes=0-9').expect(206).expect('Content-Length', '10')
    })

    it('deletes a gallery with photos and removes its stored objects', async () => {
        const galleryId = await createGallery('Disposable gallery')
        await upload(galleryId, [{ name: 'gone.jpg', buffer: await image() }])
        const [photo] = await settledPhotos(galleryId)
        const sharePath = await publishWithCover(galleryId, photo.photoId)
        const [, , slug, token] = sharePath.split('/')

        await admin.delete(`/api/admin/galleries/${galleryId}`).set('X-CSRF-Token', csrfToken).expect(204)
        await admin.get(`/api/admin/galleries/${galleryId}`).expect(404)
        await request(app.getHttpServer()).post(`/api/share/${slug}/${token}/session`).expect(403)
        expect(existsSync(join(dataDirectory, 'photos', 'galleries', galleryId, 'original', `${photo.photoId}.jpg`))).toBe(false)
        expect(existsSync(join(dataDirectory, 'photos', 'galleries', galleryId, 'thumbnail', `${photo.photoId}.webp`))).toBe(false)
    })
})
