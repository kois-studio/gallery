import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { StorageIntegrityService } from '../dist/storage/storage-integrity.service.js';

if (!process.argv.includes('--confirm-repair')) {
  console.error('Refusing to modify metadata without --confirm-repair. Review storage:verify output first.');
  process.exit(2);
}

const application = await NestFactory.createApplicationContext(AppModule, { logger: false });
try {
  const service = application.get(StorageIntegrityService);
  const report = await service.inspect();
  const result = service.repair(report);
  console.log(JSON.stringify({ report, ...result }, null, 2));
} finally {
  await application.close();
}
