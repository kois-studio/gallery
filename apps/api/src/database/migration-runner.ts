import Database from 'better-sqlite3'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

const migrationFilePattern = /^(\d{4})-([a-z0-9-]+)\.sql$/

export function runMigrations(database: Database.Database, directory = migrationsDirectory): number {
    database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

    const migrations = readdirSync(directory)
        .map(filename => {
            const match = migrationFilePattern.exec(filename)
            return match ? { filename, version: match[1] } : undefined
        })
        .filter((migration): migration is { filename: string; version: string } => Boolean(migration))
        .sort((left, right) => left.version.localeCompare(right.version))

    const appliedVersions = new Set(
        database
            .prepare('SELECT version FROM schema_migrations ORDER BY version')
            .all()
            .map(row => (row as { version: string }).version),
    )

    let appliedCount = 0

    for (const migration of migrations) {
        if (appliedVersions.has(migration.version)) {
            continue
        }

        const sql = readFileSync(join(directory, migration.filename), 'utf8')
        const applyMigration = database.transaction(() => {
            database.exec(sql)
            database
                .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
                .run(migration.version, new Date().toISOString())
        })

        applyMigration()
        appliedCount += 1
    }

    return appliedCount
}
