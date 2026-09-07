# Checkpoint — 2026-09-07

- **Session mode:** focused
- **Repository and branch:** `kois-studio/gallery` / `main`
- **Session goal:** GAL-015 initial Angular administration and visitor delivery flow
- **Status:** active; manual, performance, and release verification remain

## Completed

- Added Angular routes and typed HTTP client flows for setup, sign-in, administration, private-link exchange, and visitor delivery.
- Added the first administrator workspace for draft creation, batch upload progress, processing status, cover selection, publication, link rotation, and unpublishing.
- Added responsive visitor browsing with ready-photo filtering, keyboard-focusable photo cards, an accessible larger-view dialog, and individual original downloads.
- Added a Playwright critical journey covering administrator sign-in, gallery creation, upload/processing, cover selection, publication, private-link exchange, desktop/mobile visitor browsing, keyboard activation, larger view, and original download.
- Added repository quality commands: NestJS API Prettier with the Board Vault four-space profile, and Angular Biome formatting/linting without a frontend Prettier dependency.
- Added GitHub Actions quality gates for independent dependency installation, build/tests, browser tests, formatting/linting, Compose validation, and Docker image construction.

## Verification

- `npm run build` — pass.
- `npm run test:api` — pass, 6 tests.
- `npm run test:api:e2e` — pass, 6 tests.
- `npm run test:web` — pass, 2 tests.
- `npm run lint` — pass.
- `npm run format:check` — pass.
- `npm run test:web:e2e` — pass, 1 browser journey.
- `docker compose -f deploy/docker-compose.yml config` — pass.
- `git diff --check` — pass.

## Known limits

- Manual responsive/accessibility review, large-file streaming evidence, and Lighthouse/equivalent evidence remain open for GAL-015/GAL-016.
- The Docker image build is covered by CI but remains unverified locally because the Docker daemon is unavailable.
- The Docker image build remains unverified until a Docker daemon is available.
- Visitor selections, archives, QR generation, and extensive branding remain outside this slice.

## Next safe action

Record responsive/accessibility/performance evidence, then prepare GAL-016’s release matrix and operator evidence.
