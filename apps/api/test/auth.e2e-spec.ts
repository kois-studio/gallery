import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { App } from 'supertest/types'
import { DatabaseService } from '../src/database/database.service.js'

describe('local administrator authentication (e2e)', () => {
    let app: INestApplication<App>
    let dataDirectory: string
    const setupToken = 'local-test-setup-token-with-at-least-32-characters'

    beforeAll(async () => {
        dataDirectory = mkdtempSync(join(tmpdir(), 'gallery-auth-'))
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
    })

    it('completes one-time setup and protects the administrator session', async () => {
        const agent = request.agent(app.getHttpServer())
        const setupResponse = await agent
            .post('/api/auth/setup')
            .set('X-Setup-Token', setupToken)
            .send({ password: 'correct horse battery staple' })
            .expect(201)

        expect(setupResponse.body.administrator).toEqual({ configured: true })
        expect(setupResponse.body.csrfToken).toEqual(expect.any(String))

        await agent
            .get('/api/auth/me')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual({
                    administratorId: expect.any(String),
                    authenticated: true,
                })
            })

        await request(app.getHttpServer())
            .post('/api/auth/setup')
            .set('X-Setup-Token', setupToken)
            .send({ password: 'another correct password' })
            .expect(409)
    })

    it('rejects invalid credentials, requires CSRF, and revokes logout sessions', async () => {
        const agent = request.agent(app.getHttpServer())

        await agent.post('/api/auth/sign-in').send({ password: 'wrong password' }).expect(401)

        const signInResponse = await agent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)

        await agent.post('/api/auth/sign-out').expect(403)
        await agent.post('/api/auth/sign-out').set('X-CSRF-Token', signInResponse.body.csrfToken).expect(204)
        await agent.get('/api/auth/me').expect(401)
    })

    it('expires sessions and throttles repeated failed sign-ins', async () => {
        const agent = request.agent(app.getHttpServer())
        await agent.post('/api/auth/sign-in').send({ password: 'correct horse battery staple' }).expect(200)

        app.get(DatabaseService).connection.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run()
        await agent.get('/api/auth/me').expect(401)

        for (let attempt = 0; attempt < 5; attempt += 1) {
            await request(app.getHttpServer()).post('/api/auth/sign-in').send({ password: 'wrong password' }).expect(401)
        }
        await request(app.getHttpServer()).post('/api/auth/sign-in').send({ password: 'wrong password' }).expect(429)
    })

    afterAll(async () => {
        await app.close()
        delete process.env.SETUP_TOKEN
        delete process.env.DATABASE_PATH
        delete process.env.STORAGE_PATH
        if (dataDirectory) {
            rmSync(dataDirectory, { recursive: true, force: true })
        }
    })
})
