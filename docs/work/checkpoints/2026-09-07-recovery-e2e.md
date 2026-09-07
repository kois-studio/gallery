# Two-store recovery checkpoint

- **Session goal:** Turn the recovery contract into a repeatable automated evidence point.
- **Status:** Completed for a local synthetic installation; container/operator verification remains open.

## Delivered

- Added an API end-to-end test that creates an administrator, uploads and processes a synthetic image, publishes a private gallery, checkpoints SQLite, and copies SQLite plus the photo root into a clean temporary installation.
- The restored installation runs readiness checks, executes the storage-integrity report, exchanges the restored private link, serves a restored derivative, and downloads the restored original.
- The test loads the Nest application after setting each temporary installation’s database and storage paths, preventing cross-test configuration leakage.

## Verification

- API end-to-end suite passed: 9 tests.
- The recovery test uses only synthetic assets and removes its temporary installations after completion.
- Container image build remains unrun locally because the Docker daemon is unavailable; CI still contains the Docker build gate.

## Remaining evidence

- Run the same restore procedure against the built self-hosted container with persistent bind mounts.
- Record operator actions for missing originals, missing derivatives, extra files, and interrupted jobs.
- Complete the production-shaped restore gate before calling the first beta ready.
