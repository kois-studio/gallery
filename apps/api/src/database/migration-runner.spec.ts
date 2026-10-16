import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from './migration-runner.js'

describe('runMigrations', () => {
    it('applies the first-beta schema to a clean database and is idempotent', () => {
        const database = new Database(':memory:')

        expect(runMigrations(database)).toBe(6)
        expect(runMigrations(database)).toBe(0)

        const tables = database
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .all()
            .map(row => (row as { name: string }).name)

        expect(tables).toEqual([
            'administrators',
            'galleries',
            'photos',
            'processing_jobs',
            'schema_migrations',
            'sessions',
            'visitor_sessions',
        ])
        expect(database.prepare('SELECT version FROM schema_migrations').pluck().all()).toEqual([
            '0001',
            '0002',
            '0003',
            '0004',
            '0005',
            '0006',
        ])

        database.close()
    })
})
