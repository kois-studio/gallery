# Data and storage design

## Design status

The first-beta SQLite schema, migration runner, local storage provider, upload records, processing jobs, and cancellation markers are implemented. This document records the current boundary and the remaining recovery work; future providers and selection-related entities remain proposed.

## Proposed source of truth

SQLite is the default metadata database direction for the first installation. The application should own and migrate a database file mounted in the deployment, for example `/data/gallery.db`. A future PostgreSQL option is not part of the first contract.

Photo binaries must live outside SQLite.

The first installation has two durable stores with different consistency properties:

- SQLite is authoritative for administrator identity, sessions, galleries, photos, processing jobs, and publication/access metadata.
- The configured storage root is authoritative for original and derived bytes. It is not a web-public directory.

An upload is not complete until the original is durably stored and its metadata is committed. A photo is `ready` only when the required derivatives exist and are readable. Database rows and object files can therefore be temporarily inconsistent after a crash; startup reconciliation and an operator repair path must make that state visible and recoverable.

## Implemented and deferred entities

The first-beta schema currently contains:

- local administrator and server-side sessions;
- gallery with draft/published state and revocable share-token hash;
- photo with immutable original key, derivative keys, dimensions, ordering, processing status, and cancellation timestamp;
- processing job with attempts, timestamps, errors, retry state, and cancellation timestamp;
- visitor session records scoped to a published gallery.

Selections, expiration, visitor identities, multi-user ownership, and PostgreSQL-specific entities are not first-slice schema requirements. They must not be implied by placeholder columns.

## Storage providers

The implemented first provider is local filesystem storage. Later providers may use one generic S3-compatible adapter for Amazon S3, Cloudflare R2, Backblaze B2, MinIO, or another compatible service.

The storage boundary needs operations for:

- put/upload;
- delete;
- existence checks;
- metadata or content inspection;
- safe read/download behavior;
- derived object naming;
- recovery or reconciliation.

The application-facing read operation should return a bounded stream plus safe metadata, or a provider-neutral equivalent. It must not require every provider to expose a signed URL. A later S3-compatible adapter may use a short-lived presigned response only after authorization has been performed by the application and only when that behavior is explicitly tested.

Local storage requirements:

- one operator-configured root outside the static/public asset tree;
- generated object keys based on server-generated IDs, never raw client filenames or paths;
- temporary writes followed by an atomic rename where the filesystem supports it;
- no path traversal or symlink escape from the storage root;
- no deletion of an object until the database ownership and retry behavior are understood.

`getSignedUrl` alone is not a sufficient universal interface because local storage and object storage have different access mechanisms. The application must define how authorization is enforced for each provider.

## Data lifecycle

For each persisted entity, the design must document creation, update, publication, expiration, deletion, backup, restore, and migration behavior. Database migrations and photo-object cleanup must not silently diverge. Cancellation is implemented for pending/processing photos; gallery deletion and full reconciliation remain release work.

Important invariants include:

- a photo belongs to one gallery;
- published galleries cannot expose incomplete or unauthorized media unintentionally;
- cover selection refers to an existing usable photo;
- deleting a gallery defines what happens to originals and derivatives;
- retries do not duplicate logical photos or corrupt object ownership;
- database restore and media restore can be coordinated or their limitations are visible.

The first beta should use a single installation and one local storage root. S3-compatible storage remains a future adapter; the current design must not pretend that local filesystem semantics such as atomic rename, directory listing, or immediate consistency are universal.
