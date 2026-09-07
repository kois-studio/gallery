import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppController } from './app.controller.js';
import { validateConfiguration } from './configuration.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfiguration,
    }),
    DatabaseModule,
    ServeStaticModule.forRoot({
      rootPath: join(dirname(fileURLToPath(import.meta.url)), '..', 'public'),
      exclude: ['/api/{*any}'],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
