import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';

describe('draft galleries (e2e)', () => {
  let app: INestApplication<App>;
  let dataDirectory: string;
  let csrfToken: string;
  const setupToken = 'local-gallery-test-setup-token-with-at-least-32-characters';

  beforeAll(async () => {
    dataDirectory = mkdtempSync(join(tmpdir(), 'gallery-domain-'));
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_PATH = join(dataDirectory, 'gallery.db');
    process.env.STORAGE_PATH = join(dataDirectory, 'photos');
    process.env.SETUP_TOKEN = setupToken;

    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const setup = await request(app.getHttpServer())
      .post('/api/auth/setup')
      .set('X-Setup-Token', setupToken)
      .send({ password: 'correct horse battery staple' })
      .expect(201);
    csrfToken = setup.body.csrfToken;
  });

  it('requires administrator authentication and manages draft galleries', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/galleries')
      .send({ title: 'Unauthenticated gallery' })
      .expect(401);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/sign-in')
      .send({ password: 'correct horse battery staple' })
      .expect(200)
      .expect(({ body }) => {
        csrfToken = body.csrfToken;
      });

    await agent
      .post('/api/admin/galleries')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: '' })
      .expect(400);

    const first = await agent
      .post('/api/admin/galleries')
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'María & Pablo',
        description: 'Wedding preview',
        eventDate: '2026-09-07',
      })
      .expect(201);

    expect(first.body).toMatchObject({
      slug: 'maria-pablo',
      title: 'María & Pablo',
      status: 'draft',
      eventDate: '2026-09-07',
    });

    const second = await agent
      .post('/api/admin/galleries')
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'María & Pablo' })
      .expect(201);
    expect(second.body.slug).toBe('maria-pablo-2');

    await agent
      .patch(`/api/admin/galleries/${first.body.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'María & Pablo - final', description: null, eventDate: null })
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe('María & Pablo - final');
        expect(body.description).toBeNull();
      });

    await agent.get('/api/admin/galleries').expect(200).expect(({ body }) => {
      expect(body.galleries).toHaveLength(2);
    });

    await agent
      .delete(`/api/admin/galleries/${second.body.id}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(204);
    await agent.get(`/api/admin/galleries/${second.body.id}`).expect(404);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.SETUP_TOKEN;
    delete process.env.DATABASE_PATH;
    delete process.env.STORAGE_PATH;
    rmSync(dataDirectory, { recursive: true, force: true });
  });
});
