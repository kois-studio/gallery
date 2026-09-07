import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import request from 'supertest'
import { App } from 'supertest/types'
import { DatabaseService } from '../src/database/database.service.js'

describe('draft galleries (e2e)', () => {
    let app: INestApplication<App>
    let dataDirectory: string
    let csrfToken: string
    const setupToken = 'local-gallery-test-setup-token-with-at-least-32-characters'

    beforeAll(async () => {
        dataDirectory = mkdtempSync(join(tmpdir(), 'gallery-domain-'))
        process.env.NODE_ENV = 'test'
        process.env.DATABASE_PATH = join(dataDirectory, 'gallery.db')
        process.env.STORAGE_PATH = join(dataDirectory, 'photos')
        process.env.SETUP_TOKEN = setupToken

        const { AppModule } = await import('./../src/app.module.js')
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()
        app = moduleFixture.createNestApplication()
        await app.init()

        const setup = await request(app.getHttpServer())
            .post('/api/auth/setup')
            .set('X-Setup-Token', setupToken)
            .send({ password: 'correct horse battery staple' })
            .expect(201)
        csrfToken = setup.body.csrfToken
    })

    it('requires administrator authentication and manages draft galleries', async () => {
        await request(app.getHttpServer()).post('/api/admin/galleries').send({ title: 'Unauthenticated gallery' }).expect(401)

        const agent = request.agent(app.getHttpServer())
        await agent
            .post('/api/auth/sign-in')
            .send({ password: 'correct horse battery staple' })
            .expect(200)
            .expect(({ body }) => {
                csrfToken = body.csrfToken
            })

        await agent.post('/api/admin/galleries').set('X-CSRF-Token', csrfToken).send({ title: '' }).expect(400)

        const first = await agent
            .post('/api/admin/galleries')
            .set('X-CSRF-Token', csrfToken)
            .send({
                title: 'María & Pablo',
                description: 'Wedding preview',
                eventDate: '2026-09-07',
            })
            .expect(201)

        expect(first.body).toMatchObject({
            slug: 'maria-pablo',
            title: 'María & Pablo',
            status: 'draft',
            eventDate: '2026-09-07',
        })

        const second = await agent.post('/api/admin/galleries').set('X-CSRF-Token', csrfToken).send({ title: 'María & Pablo' }).expect(201)
        expect(second.body.slug).toBe('maria-pablo-2')

        await agent
            .patch(`/api/admin/galleries/${first.body.id}`)
            .set('X-CSRF-Token', csrfToken)
            .send({ title: 'María & Pablo - final', description: null, eventDate: null })
            .expect(200)
            .expect(({ body }) => {
                expect(body.title).toBe('María & Pablo - final')
                expect(body.description).toBeNull()
            })

        await agent
            .get('/api/admin/galleries')
            .expect(200)
            .expect(({ body }) => {
                expect(body.galleries).toHaveLength(2)
            })

        await agent.delete(`/api/admin/galleries/${second.body.id}`).set('X-CSRF-Token', csrfToken).expect(204)
        await agent.get(`/api/admin/galleries/${second.body.id}`).expect(404)
    })

    it('stages accepted image bytes and reports rejected files without silent loss', async () => {
        const agent = request.agent(app.getHttpServer())
        const signIn = await agent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)
        csrfToken = signIn.body.csrfToken

        const gallery = await agent.post('/api/admin/galleries').set('X-CSRF-Token', csrfToken).send({ title: 'Upload test' }).expect(201)

        const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
        const accepted = await agent
            .post(`/api/admin/galleries/${gallery.body.id}/photos`)
            .set('X-CSRF-Token', csrfToken)
            .attach('files', image, 'IMG_001.PNG')
            .expect(201)

        expect(accepted.body.files).toEqual([
            expect.objectContaining({
                originalName: 'IMG_001.PNG',
                bytes: image.length,
                status: 'queued',
            }),
        ])

        const rejected = await agent
            .post(`/api/admin/galleries/${gallery.body.id}/photos`)
            .set('X-CSRF-Token', csrfToken)
            .attach('files', Buffer.from('not an image'), 'notes.txt')
            .expect(201)
        expect(rejected.body.files).toEqual([expect.objectContaining({ originalName: 'notes.txt', status: 'rejected' })])

        let photoStatus: { photoId: string; status: string } | undefined
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const response = await agent.get(`/api/admin/galleries/${gallery.body.id}/photos`).expect(200)
            photoStatus = response.body.files[0]
            if (photoStatus.status === 'ready') {
                break
            }
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        expect(photoStatus?.status).toBe('ready')

        await agent
            .patch(`/api/admin/galleries/${gallery.body.id}/cover`)
            .set('X-CSRF-Token', csrfToken)
            .send({ photoId: photoStatus?.photoId })
            .expect(200)
            .expect(({ body }) => {
                expect(body.coverPhotoId).toBe(photoStatus?.photoId)
            })

        const published = await agent.post(`/api/admin/galleries/${gallery.body.id}/publish`).set('X-CSRF-Token', csrfToken).expect(201)
        const sharePath = published.body.sharePath as string
        const [, , slug, token] = sharePath.split('/')
        expect(slug).toBe('upload-test')
        expect(token).toEqual(expect.any(String))

        await request(app.getHttpServer()).post(`/api/share/${slug}/invalid-token/session`).expect(403)

        const visitor = request.agent(app.getHttpServer())
        await visitor.post(`/api/share/${slug}/${token}/session`).expect(200)
        const metadata = await visitor.get(`/api/shared/galleries/${slug}`).expect(200)
        expect(metadata.body.gallery).toMatchObject({ slug, title: 'Upload test' })
        expect(metadata.body.photos).toHaveLength(1)

        await visitor
            .get(`/api/shared/galleries/${slug}/photos/${photoStatus?.photoId}/thumbnail`)
            .expect(200)
            .expect('Content-Type', /image\/webp/)
        await visitor
            .get(`/api/shared/galleries/${slug}/photos/${photoStatus?.photoId}/original`)
            .expect(200)
            .expect('Content-Disposition', /attachment/)

        const rotated = await agent.post(`/api/admin/galleries/${gallery.body.id}/rotate-link`).set('X-CSRF-Token', csrfToken).expect(201)
        await visitor.get(`/api/shared/galleries/${slug}`).expect(401)

        const [, , rotatedSlug, rotatedToken] = (rotated.body.sharePath as string).split('/')
        const rotatedVisitor = request.agent(app.getHttpServer())
        await rotatedVisitor.post(`/api/share/${rotatedSlug}/${rotatedToken}/session`).expect(200)
        await rotatedVisitor.get(`/api/shared/galleries/${rotatedSlug}`).expect(200)

        await agent.post(`/api/admin/galleries/${gallery.body.id}/unpublish`).set('X-CSRF-Token', csrfToken).expect(201)
        await rotatedVisitor.get(`/api/shared/galleries/${rotatedSlug}`).expect(401)
    })

    it('cancels pending processing and keeps the cancelled state visible to the administrator', async () => {
        const agent = request.agent(app.getHttpServer())
        const signIn = await agent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)
        csrfToken = signIn.body.csrfToken
        const gallery = await agent
            .post('/api/admin/galleries')
            .set('X-CSRF-Token', csrfToken)
            .send({ title: 'Cancellation test' })
            .expect(201)
        const photoId = randomUUID()
        const now = new Date().toISOString()
        const database = app.get(DatabaseService).connection
        database
            .prepare(
                `INSERT INTO photos
          (id, gallery_id, original_name, original_key, mime_type, original_bytes,
           processing_status, created_at, updated_at)
         VALUES (?, ?, 'pending.jpg', ?, 'image/jpeg', 1, 'pending', ?, ?)`,
            )
            .run(photoId, gallery.body.id, `galleries/${gallery.body.id}/original/${photoId}.jpg`, now, now)
        database
            .prepare(
                `INSERT INTO processing_jobs
          (id, photo_id, status, attempts, available_at, created_at, updated_at)
         VALUES (?, ?, 'queued', 0, ?, ?, ?)`,
            )
            .run(photoId, photoId, now, now, now)

        await agent
            .post(`/api/admin/galleries/${gallery.body.id}/photos/${photoId}/cancel`)
            .set('X-CSRF-Token', csrfToken)
            .expect(201)
            .expect(({ body }) => expect(body).toEqual({ photoId, status: 'cancelled' }))

        await agent
            .get(`/api/admin/galleries/${gallery.body.id}/photos`)
            .expect(200)
            .expect(({ body }) => expect(body.files).toEqual([expect.objectContaining({ photoId, status: 'cancelled' })]))
    })

    it('records a synthetic twenty-file upload and processing workload', async () => {
        const agent = request.agent(app.getHttpServer())
        const signIn = await agent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)
        csrfToken = signIn.body.csrfToken
        const gallery = await agent
            .post('/api/admin/galleries')
            .set('X-CSRF-Token', csrfToken)
            .send({ title: 'Synthetic workload' })
            .expect(201)
        const width = 1600
        const height = 1200
        const pixels = Buffer.alloc(width * height * 3)
        for (let offset = 0; offset < pixels.length; offset += 3) {
            pixels[offset] = (offset / 3) % 251
            pixels[offset + 1] = (offset / 7) % 251
            pixels[offset + 2] = (offset / 13) % 251
        }
        const image = await sharp(pixels, { raw: { width, height, channels: 3 } })
            .jpeg({ quality: 84 })
            .toBuffer()
        const uploadStarted = performance.now()
        let uploadRequest = agent.post(`/api/admin/galleries/${gallery.body.id}/photos`).set('X-CSRF-Token', csrfToken)
        for (let index = 0; index < 20; index += 1) {
            uploadRequest = uploadRequest.attach('files', image, `IMG-${String(index + 1).padStart(3, '0')}.png`)
        }
        const uploaded = await uploadRequest.expect(201)
        const uploadMs = Math.round(performance.now() - uploadStarted)
        expect(uploaded.body.files).toHaveLength(20)

        const processingStarted = performance.now()
        let ready = 0
        for (let attempt = 0; attempt < 100; attempt += 1) {
            const status = await agent.get(`/api/admin/galleries/${gallery.body.id}/photos`).expect(200)
            ready = status.body.files.filter((file: { status: string }) => file.status === 'ready').length
            if (ready === 20) break
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        const processingMs = Math.round(performance.now() - processingStarted)
        console.log(
            `[media-workload] ${JSON.stringify({ files: 20, width, height, bytesPerFile: image.length, uploadMs, processingMs, ready })}`,
        )
        expect(ready).toBe(20)
    })

    afterAll(async () => {
        await app.close()
        delete process.env.SETUP_TOKEN
        delete process.env.DATABASE_PATH
        delete process.env.STORAGE_PATH
        rmSync(dataDirectory, { recursive: true, force: true })
    })
})
