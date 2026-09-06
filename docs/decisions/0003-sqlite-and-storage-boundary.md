# ADR 0003: SQLite metadata and pluggable photo storage

- **Status:** Accepted for the first design
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Self-hosting should be simple for a photographer or developer. Gallery metadata and photo binaries have different storage characteristics, and the first installation should not require provisioning an external database or object-storage service.

## Decision

SQLite is the default metadata database for the first installation. Photo binaries remain outside SQLite behind a storage boundary. Local filesystem storage is the first provider; an S3-compatible adapter may follow when real demand justifies it.

## Consequences

The default deployment can be zero- or low-configuration and can run on modest infrastructure. The project must design migrations, filesystem safety, backup coordination, derivative cleanup, storage authorization, and SQLite concurrency behavior carefully. PostgreSQL is not part of the first implementation contract.

## Alternatives considered

- PostgreSQL by default: rejected for the first installation because it adds provisioning and operational burden without demonstrated need.
- Store images in SQLite: rejected because binary media would make database growth, delivery, and backup behavior worse.
- Provider-specific storage integrations first: rejected in favor of one local provider and a later generic S3-compatible boundary.
