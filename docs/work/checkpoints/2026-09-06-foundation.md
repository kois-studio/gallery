# Checkpoint — 2026-09-06

- **Session mode:** focused
- **Repository and branch:** `kois-studio/gallery` / `main`
- **Commit:** working tree pending foundation checkpoint commit
- **Session goal:** GAL-008 runtime foundation
- **Status:** ready to continue

## Completed

- Scaffolded Angular 22 in `apps/web` and NestJS 12 in `apps/api`.
- Added Node 24/npm 11 toolchain policy and independent application lockfiles.
- Added validated runtime configuration, SQLite connection lifecycle, health, and readiness endpoints.
- Added root build/test orchestration and Angular-to-NestJS production asset synchronization.
- Added one-image Docker packaging and Docker Compose configuration with `/data` and `/photos` persistence.
- Replaced generated Angular placeholder content with the initial Gallery product shell.

## Verification

- `npm run build` — pass.
- `npm run test:web` — pass, 2 tests.
- `npm run test:api` — pass, 2 tests.
- `npm run test:api:e2e` — pass, 2 tests.
- `npm run lint` — pass.
- `docker build -f deploy/Dockerfile -t kois-gallery:foundation .` — not run; Docker daemon was unavailable.
- Manual production API check on port 3401 — pass for `/api/health`, `/api/ready`, and `/` serving the Angular index.

## Decisions and risks

- The product uses one NestJS-served Angular bundle in production, while development may run the two applications separately.
- Native `better-sqlite3` installation and the Docker build still require verification when the Docker daemon is available.
- Domain implementation begins with SQLite schema and migrations; `landing/` remains outside this session.

## Work queue changes

- GAL-008 completed and removed from the active queue.
- GAL-009 is the next implementation slice.

## Next safe action

Implement the first-slice SQLite schema and migration runner in GAL-009.
