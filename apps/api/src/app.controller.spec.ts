import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { DatabaseService } from './database/database.service.js';

describe('AppController', () => {
  it('reports the API health', async () => {
    const database = { ping: vi.fn() };
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DatabaseService, useValue: database },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    const controller = module.get(AppController);

    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('reports readiness when SQLite and storage are available', async () => {
    const storagePath = mkdtempSync(join(tmpdir(), 'gallery-ready-'));
    const database = { ping: vi.fn() };
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DatabaseService, useValue: database },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(storagePath) },
        },
      ],
    }).compile();

    try {
      const controller = module.get(AppController);

      expect(controller.ready()).toEqual({ status: 'ready' });
      expect(database.ping).toHaveBeenCalledOnce();
    } finally {
      rmSync(storagePath, { recursive: true, force: true });
    }
  });
});
