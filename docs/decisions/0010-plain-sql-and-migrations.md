# ADR 0010: Plain SQL and explicit SQLite migrations

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

The first Gallery installation has a small metadata model, one SQLite database, and a strong need for transparent backups, restores, and schema evolution. The project does not yet have multiple database providers or a second consumer that requires an ORM abstraction.

## Decision

Gallery uses parameterized SQL behind explicit repository/data-access interfaces. The first SQLite driver is `better-sqlite3`. Schema changes are numbered SQL migration files executed by a small repository-owned migration runner that records applied versions in SQLite.

The database boundary owns connection setup, foreign-key enforcement, WAL configuration, busy timeout, transactions, migration execution, and safe shutdown. Application/domain services do not receive the driver object or construct SQL outside the data-access boundary. Queries remain parameterized and are covered by repository/integration tests.

No ORM or query builder is introduced for the first release. A future query layer or PostgreSQL adapter requires measured demand and a new decision; it must preserve the repository/domain boundary and migration/recovery contract.

## Consequences

SQL remains visible, easy to compare with the database, and familiar from Board Vault. The project must write and maintain row mapping, validation, transaction behavior, and migration tests itself. `better-sqlite3` is a native dependency, so clean installation and supported CPU architectures must be verified in Docker and CI.

## Alternatives considered

- **Drizzle or another ORM/query builder:** deferred because it adds a schema/query abstraction before Gallery has a second database or consumer requirement.
- **Node `node:sqlite`:** deferred because the official module remains a release-candidate API in the selected Node generation.
- **Raw SQL throughout the application:** rejected because repositories and infrastructure interfaces are still required to keep domain/application code independent of SQLite.
