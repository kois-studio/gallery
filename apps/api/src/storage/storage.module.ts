import { Global, Module } from '@nestjs/common'
import { LocalStorageService } from './storage.service.js'
import { StorageIntegrityService } from './storage-integrity.service.js'

@Global()
@Module({
    providers: [LocalStorageService, StorageIntegrityService],
    exports: [LocalStorageService, StorageIntegrityService],
})
export class StorageModule {}
