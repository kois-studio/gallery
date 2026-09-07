# First-beta release evidence matrix

## Current outcome

Gallery is a functional first vertical slice and a beta candidate in active hardening. It is not yet beta-ready because container/operator verification, representative photographer workload evidence, and the final OSS/release decisions remain open.

## Evidence already passing locally

| Area | Evidence | Result |
| --- | --- | --- |
| Database | Clean migrations, idempotent migration runs, SQLite repositories | Pass |
| Authentication | Setup re-entry, scrypt hashing, sessions, expiry, CSRF, logout revocation, failed-login throttling | Pass |
| Gallery domain | Draft creation, slug uniqueness, cover selection, publication guards | Pass |
| Uploads | JPEG/PNG/WebP signature checks, size/count/batch limits, visible rejection state, atomic local storage | Pass |
| Processing | Durable jobs, two-worker bound, Sharp derivatives, retry state, cancellation, interrupted-job requeue | Pass locally; scale evidence open |
| Private delivery | Bearer-link exchange, scoped visitor session, rotation, unpublish revocation, derivative/original authorization | Pass locally |
| Browser journey | Angular admin setup/upload/publish and visitor browse/download through packaged Playwright | Pass locally |
| Recovery | Synthetic SQLite plus storage copy into a clean installation, integrity report, restored private link and media access | Pass locally; container/operator gate open |
| Storage recovery | Read-only `storage:verify` plus confirmation-gated `storage:repair` | Pass locally |
| Landing | Static Astro build, formatting, responsive CSS contract, accurate current/future capability copy | Pass locally |
| Packaging definition | Docker Compose configuration validation | Pass; image execution open locally |

The latest synthetic media signal is 20 deterministic 1600×1200 JPEGs at 571,886 encoded bytes per file: 31 ms upload acknowledgement and 2,557 ms until all derivatives were ready on the development machine. This is an engineering baseline, not a production guarantee.

## Evidence still required before beta

- Build and run the self-hosted Docker image with persistent `/data` and `/photos` mounts.
- Execute the restore procedure against the container, including `storage:verify`, approved repair, and post-repair verification.
- Exercise representative camera files and a Lino-approved event-sized workload.
- Record storage-full/permission failure behavior and resource measurements on the supported deployment architectures, including arm64 if it remains supported.
- Complete the production reverse-proxy, secure-cookie, readiness, and direct-media security checks.
- Perform manual responsive/accessibility/performance review on representative desktop and mobile browsers.
- Decide the OSS license before publishing a meaningful stable release.
- Observe Lino’s workflow and decide whether server-backed selections are required for this beta.

## Known intentional boundaries

- This is one self-hosted installation, not a Kois-managed SaaS.
- Local filesystem storage is the only implemented provider; S3-compatible storage is deferred.
- Upload-request idempotency is not part of the current first-slice contract.
- Selection persistence, expiration, visitor passwords, batch archives, SDK, MCP, and PostgreSQL remain evidence-gated future work.

## Useful commands

```sh
npm run test
npm run test:api:e2e
npm run test:web:e2e
npm run lint
npm run format:check
npm run build:landing
npm run storage:verify
docker compose -f deploy/docker-compose.yml config
docker build -f deploy/Dockerfile -t kois-gallery:local .
```

The Docker build command is expected to remain unrun locally while the Docker daemon is unavailable; CI contains the equivalent image-build gate.
