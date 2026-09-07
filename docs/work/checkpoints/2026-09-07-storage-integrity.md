# Storage integrity verification checkpoint

- **Session goal:** Add an executable recovery-integrity check for GAL-016/GAL-017.
- **Status:** Completed for read-only detection; restore execution remains open.

## Delivered

- Added `StorageIntegrityService` to compare SQLite photo references with the configured local storage root.
- Added `npm run storage:verify` to the API and documented its Docker invocation.
- Added confirmation-gated `npm run storage:repair -- --confirm-repair` to requeue missing derivatives and mark missing originals failed.
- The report identifies missing originals, missing ready-photo thumbnail/display derivatives, and unreferenced durable files.
- Temporary upload files are excluded from the durable-object scan.
- The command exits non-zero when any integrity problem is found and never deletes files or rewrites the database.
- The repair command never deletes unreferenced files and requires explicit confirmation.
- Added unit coverage for filesystem listing, integrity reporting, derivative repair, and missing-original failure handling.

## Verification

- API build passed.
- API unit tests passed: 10 tests.
- API end-to-end tests passed: 8 tests.
- API lint and formatting checks passed.
- The command passed against a clean temporary installation and returned an empty report.
- The repair and verify commands passed against a clean temporary installation.

## Remaining evidence

- Run the command after restoring a populated SQLite database and photo root.
- Decide and document the operator action for each missing-object category.
- Exercise storage-full, representative camera files, and architecture-specific container behavior before beta.
