import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { accessSync, constants, mkdirSync } from 'node:fs';
import type { GalleryConfiguration } from './configuration.js';
import { DatabaseService } from './database/database.service.js';

@Controller('api')
export class AppController {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<GalleryConfiguration, true>,
  ) {}

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(200)
  ready(): { status: 'ready' } {
    try {
      this.database.ping();
      const storagePath = this.config.get('STORAGE_PATH', { infer: true });
      mkdirSync(storagePath, { recursive: true });
      accessSync(storagePath, constants.R_OK | constants.W_OK);
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready' });
    }
  }
}
