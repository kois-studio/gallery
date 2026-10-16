# First-beta release evidence matrix

## Current outcome

Gallery is a functional first vertical slice and a beta candidate in active hardening. The local arm64 Docker build, startup, healthcheck, readiness endpoint, migration path, storage verification, and synthetic container restore now pass. Gallery is not yet beta-ready because representative photographer workload evidence, browser/security review, production-proxy checks, and final OSS/release decisions remain open.

## Evidence already passing locally

| Area | Evidence | Result |
| --- | --- | --- |
| Database | Clean migrations, idempotent migration runs, SQLite repositories | Pass |
| Automated quality | Unit tests, API e2e, packaged browser e2e, Angular Biome, API oxlint, formatting, landing build, and diff validation | Pass locally on 2026-09-08; latest packaged browser journey passed after the proxy-boundary change |
| Authentication | Setup re-entry, scrypt hashing, sessions, expiry, CSRF, logout revocation, failed-login throttling | Pass |
| Gallery domain | Draft creation, slug uniqueness, cover selection, publication guards | Pass |
| Uploads | JPEG/PNG/WebP signature checks, size/count/batch limits, visible rejection state, atomic local storage | Pass |
| Processing | Durable jobs, two-worker bound, Sharp derivatives, retry state, cancellation, interrupted-job requeue, partial-derivative cleanup, operator-visible processing errors, and a packaged 20-file synthetic batch | Pass locally and in an arm64 container; camera/scale evidence open |
| Private delivery | Bearer-link exchange, scoped visitor session, rotation, unpublish revocation, derivative/original authorization | Pass locally |
| Production boundary probe | Production cookies, unauthenticated admin denial, explicit `/data` and `/photos` denial, disallowed CORS origin, readiness, security headers, and removal of Express fingerprinting | Pass in a fresh production-mode container; real reverse-proxy/TLS evidence open |
| Browser journey | Angular admin setup/upload/publish and visitor browse/download through packaged Playwright | Pass locally |
| Recovery | Synthetic SQLite plus storage copy into a clean installation, integrity report, restored private link and media access | Pass locally and in an isolated arm64 container; representative/production evidence open |
| Storage recovery | Read-only `storage:verify` plus confirmation-gated `storage:repair` before and after isolated container restore | Pass locally; representative storage-failure evidence open |
| Container runtime | Multi-stage image build, non-root startup, five SQLite migrations, healthcheck, `/api/ready`, Angular static delivery, empty-storage verification, and isolated restore on Docker Desktop arm64 | Pass locally on arm64 and emulated amd64; representative evidence remains open |
| Operator proxy baseline | Loopback-only Compose binding, configurable host port, CORS-origin configuration, and a minimal Caddy TLS reverse-proxy recipe | Verified locally (`127.0.0.1:3000`, readiness, direct `/data` denial); live DNS/TLS/forwarded-header verification remains open |
| Local review flows | Clean setup profile and seeded single-container demo profile with synthetic galleries/images, plus automated reset/start/seed/visitor verification | Pass locally with `npm run test:local:flows` |
| Landing | Static Astro build, formatting, responsive CSS contract, accurate current/future capability copy | Pass locally |
| Packaging definition | Docker Compose configuration, image build, and local container execution | Pass locally; representative and production-operator evidence remain open |

The latest packaged-container workload signal is 20 synthetic 1600×1200 JPEGs: 83 ms multipart upload acknowledgement, 3,143 ms until all derivatives were ready, and approximately 160 MiB sampled container memory on Docker Desktop arm64. The earlier local signal used 20 deterministic 1600×1200 JPEGs at 571,886 encoded bytes per file: 31 ms upload acknowledgement and 2,557 ms until all derivatives were ready. These are engineering baselines, not production guarantees or camera-workload evidence.

## Evidence still required before beta

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
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml ps
docker compose -f deploy/docker-compose.yml exec -T gallery node scripts/verify-storage.mjs
```

The local Docker image build, startup, and synthetic restore gate passed on Docker Desktop arm64 on 2026-09-08. Remaining gates cover representative workload, supported architectures, production proxy/security behavior, browser review, and operator caveats.
