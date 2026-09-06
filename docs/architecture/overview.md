# Proposed architecture overview

## Design status

This document describes a proposed progression, not implemented architecture.

Gallery should begin as one self-hostable application with explicit internal boundaries. The monorepo should grow into multiple apps or packages only when independent consumers or deployment needs justify them.

Conceptual direction:

```text
Web UI
  ↓
Application and domain services
  ↓
Database + storage + image-processing boundary
```

Future consumers may include:

```text
Web UI / headless frontend / SDK / MCP
              ↓
      Application and domain services
              ↓
       Database + storage adapters
```

## Boundary principles

- Business rules must not be duplicated across web, SDK, MCP, or integrations.
- The MCP server must never write directly to SQLite.
- The web UI should not own authorization or persistence invariants.
- Image binaries must not be stored in the metadata database.
- Storage providers must be replaceable without rewriting domain behavior.
- The first deployment must work with local storage and a single database file.
- Future abstractions must be introduced when a second real implementation or consumer justifies them.

## Likely internal responsibilities

- application services for gallery, photo, access, selection, and processing use cases;
- domain types and policies for visibility, publication, ownership, and state transitions;
- database adapter for SQLite and migrations;
- storage adapter for local files and later S3-compatible providers;
- image-processing adapter and processing state;
- web interface and public gallery rendering;
- configuration and operator diagnostics.

The exact framework, runtime, ORM/query layer, and package layout remain open.
