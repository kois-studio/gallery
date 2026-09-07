import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { StorageIntegrityService } from '../dist/storage/storage-integrity.service.js';

const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
try {
  const report = await application.get(StorageIntegrityService).inspect();
  console.log(JSON.stringify(report, null, 2));
  if (StorageIntegrityService.hasProblems(report)) {
    process.exitCode = 2;
  }
} finally {
  await application.close();
}
