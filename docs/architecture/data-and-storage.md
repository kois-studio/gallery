# Data and storage design

## Proposed source of truth

SQLite is the default metadata database direction for the first installation. The application should own and migrate a database file mounted in the deployment, for example `/data/gallery.db`. A future PostgreSQL option is not part of the first contract.

Photo binaries must live outside SQLite.

## Likely entities

These are design candidates, not a finalized schema:

- administrator or user;
- gallery;
- photo;
- processing state or job;
- selection or favorite;
- access/session record where required by the selected authentication model.

Likely gallery fields include an id, slug, title, description, event date, visibility, cover photo, created time, updated time, and optional expiration. Likely photo fields include gallery id, storage keys, dimensions, capture time, position, and processing status.

## Storage providers

The first provider should be local filesystem storage. Later providers may use one generic S3-compatible adapter for Amazon S3, Cloudflare R2, Backblaze B2, MinIO, or another compatible service.

The storage boundary needs operations for:

- put/upload;
- delete;
- existence checks;
- metadata or content inspection;
- safe read/download behavior;
- derived object naming;
- recovery or reconciliation.

`getSignedUrl` alone is not a sufficient universal interface because local storage and object storage have different access mechanisms. The application must define how authorization is enforced for each provider.

## Data lifecycle

For each persisted entity, the design must document creation, update, publication, expiration, deletion, backup, restore, and migration behavior. Database migrations and photo-object cleanup must not silently diverge.

Important invariants include:

- a photo belongs to one gallery;
- published galleries cannot expose incomplete or unauthorized media unintentionally;
- cover selection refers to an existing usable photo;
- deleting a gallery defines what happens to originals and derivatives;
- retries do not duplicate logical photos or corrupt object ownership;
- database restore and media restore can be coordinated or their limitations are visible.
