# Checkpoint — 2026-09-07

- **Session mode:** focused
- **Repository and branch:** `kois-studio/gallery` / `main`
- **Session goal:** GAL-012 upload state and GAL-013 derivatives/cover
- **Status:** derivative slice completed; GAL-012 remains active for cancellation and workload verification

## Completed

- Added disk-backed multipart staging with a 100 MiB per-file and 500-file limit.
- Added server-side JPEG/PNG/WebP signature validation and a 10 GiB batch limit.
- Moved accepted originals atomically into generated gallery storage keys.
- Added durable processing jobs with bounded two-job concurrency, retry attempts, and restart requeue of interrupted work.
- Added Sharp inspection with a 100-megapixel decoded-area limit.
- Added EXIF orientation-aware WebP display and thumbnail derivatives.
- Added ready-only cover selection and API-visible processing states.
- Added safe original-name handling without using client paths as storage keys.

## Verification

- `npm run build` — pass.
- `npm run test:api` — pass, 6 tests.
- `npm run test:api:e2e` — pass, 6 tests.
- `npm run lint` — pass.
- End-to-end coverage includes a real PNG upload, durable queue processing, ready-state polling, derivative completion, rejected non-image upload, and cover selection.
- Repository coverage includes interrupted-job requeue behavior and storage-boundary protections.

## Known limits

- Explicit cancellation semantics are not implemented yet.
- Representative camera workload, x64/arm64 resource measurements, missing-object recovery, and storage-full exercises remain release verification work.
- Visitor delivery and private bearer-link authorization are not implemented yet.
- Docker image build remains unverified until a Docker daemon is available.

## Next safe action

Implement GAL-014: private publication, revocable bearer links, and authorization-aware media delivery.
