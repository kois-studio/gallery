import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { App } from 'supertest/types'
import { DatabaseService } from '../src/database/database.service.js'
import { StorageIntegrityService } from '../src/storage/storage-integrity.service.js'

const setupToken = 'local-gallery-recovery-setup-token-with-at-least-32-characters'

describe('two-store recovery (e2e)', () => {
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    let sourceDirectory: string
    let restoreDirectory: string

    it('restores SQLite and local media into a clean installation', async () => {
        sourceDirectory = mkdtempSync(join(tmpdir(), 'gallery-recovery-source-'))
        restoreDirectory = mkdtempSync(join(tmpdir(), 'gallery-recovery-restore-'))
        const sourceStorage = join(sourceDirectory, 'photos')
        const restoreStorage = join(restoreDirectory, 'photos')
        const sourceDatabase = join(sourceDirectory, 'gallery.db')
        const restoreDatabase = join(restoreDirectory, 'gallery.db')
        let sourceApp: INestApplication<App> | undefined
        let restoredApp: INestApplication<App> | undefined

        try {
            sourceApp = await createApp(sourceDatabase, sourceStorage)
            const sourceAgent = request.agent(sourceApp.getHttpServer())
            await sourceAgent
                .post('/api/auth/setup')
                .set('X-Setup-Token', setupToken)
                .send({ password: 'correct horse battery staple' })
                .expect(201)
            const signIn = await sourceAgent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)
            const csrfToken = signIn.body.csrfToken as string
            const gallery = await sourceAgent
                .post('/api/admin/galleries')
                .set('X-CSRF-Token', csrfToken)
                .send({ title: 'Recovery gallery' })
                .expect(201)
            const uploaded = await sourceAgent
                .post(`/api/admin/galleries/${gallery.body.id}/photos`)
                .set('X-CSRF-Token', csrfToken)
                .attach('files', image, 'recovery.png')
                .expect(201)

            let photo: { photoId: string; status: string } | undefined
            for (let attempt = 0; attempt < 40; attempt += 1) {
                const listed = await sourceAgent.get(`/api/admin/galleries/${gallery.body.id}/photos`).expect(200)
                photo = listed.body.files[0]
                if (photo?.status === 'ready') {
                    break
                }
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            expect(uploaded.body.files[0].status).toBe('queued')
            expect(photo?.status).toBe('ready')

            await sourceAgent
                .patch(`/api/admin/galleries/${gallery.body.id}/cover`)
                .set('X-CSRF-Token', csrfToken)
                .send({ photoId: photo?.photoId })
                .expect(200)
            const published = await sourceAgent
                .post(`/api/admin/galleries/${gallery.body.id}/publish`)
                .set('X-CSRF-Token', csrfToken)
                .expect(201)
            const [, , slug, token] = (published.body.sharePath as string).split('/')

            sourceApp.get(DatabaseService).connection.pragma('wal_checkpoint(TRUNCATE)')
            await sourceApp.close()
            sourceApp = undefined

            cpSync(sourceDatabase, restoreDatabase)
            cpSync(sourceStorage, restoreStorage, { recursive: true })

            restoredApp = await createApp(restoreDatabase, restoreStorage)
            await request(restoredApp.getHttpServer()).get('/api/ready').expect(200).expect({ status: 'ready' })
            const report = await restoredApp.get(StorageIntegrityService).inspect()
            expect(StorageIntegrityService.hasProblems(report)).toBe(false)
            expect(report).toMatchObject({ checkedPhotos: 1, referencedObjects: 3, presentObjects: 3 })

            const visitor = request.agent(restoredApp.getHttpServer())
            await visitor.post(`/api/share/${slug}/${token}/session`).expect(200)
            await visitor
                .get(`/api/shared/galleries/${slug}`)
                .expect(200)
                .expect(({ body }) => {
                    expect(body.gallery).toMatchObject({ slug: 'recovery-gallery', title: 'Recovery gallery' })
                    expect(body.photos).toHaveLength(1)
                })
            await visitor.get(`/api/shared/galleries/${slug}/photos/${photo?.photoId}/thumbnail`).expect(200)
            await visitor
                .get(`/api/shared/galleries/${slug}/photos/${photo?.photoId}/original`)
                .expect(200)
                .expect('Content-Disposition', /attachment/)
        } finally {
            await restoredApp?.close()
            await sourceApp?.close()
            delete process.env.SETUP_TOKEN
            delete process.env.DATABASE_PATH
            delete process.env.STORAGE_PATH
            rmSync(sourceDirectory, { recursive: true, force: true })
            rmSync(restoreDirectory, { recursive: true, force: true })
        }
    })
})

async function createApp(databasePath: string, storagePath: string): Promise<INestApplication<App>> {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_PATH = databasePath
    process.env.STORAGE_PATH = storagePath
    process.env.SETUP_TOKEN = setupToken
    const { AppModule } = await import('../src/app.module.js')
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile()
    const app = moduleFixture.createNestApplication<App>()
    await app.init()
    return app
}
