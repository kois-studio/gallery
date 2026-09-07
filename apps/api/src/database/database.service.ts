import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { GalleryConfiguration } from '../configuration.js'
import { runMigrations } from './migration-runner.js'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name)
    private database?: Database.Database

    constructor(private readonly config: ConfigService<GalleryConfiguration, true>) {}

    onModuleInit(): void {
        const path = this.config.get('DATABASE_PATH', { infer: true })

        if (path !== ':memory:') {
            mkdirSync(dirname(path), { recursive: true })
        }

        this.database = new Database(path)
        this.database.pragma('foreign_keys = ON')
        this.database.pragma('journal_mode = WAL')
        this.database.pragma('busy_timeout = 5000')
        this.database.prepare('SELECT 1').get()
        const migrationsApplied = runMigrations(this.database)
        if (migrationsApplied > 0) {
            this.logger.log(`Applied ${migrationsApplied} SQLite migration(s)`)
        }
        this.logger.log('SQLite connection initialized')
    }

    onModuleDestroy(): void {
        this.database?.close()
        this.database = undefined
    }

    ping(): void {
        this.requireDatabase().prepare('SELECT 1').get()
    }

    get connection(): Database.Database {
        return this.requireDatabase()
    }

    private requireDatabase(): Database.Database {
        if (!this.database) {
            throw new Error('SQLite connection is not initialized')
        }

        return this.database
    }
}
