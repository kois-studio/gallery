# Release-evidence transition — 2026-09-08

## Decision

Gallery has moved from feature implementation into release-evidence mode.

The first product slice is intentionally frozen while the project verifies the actual self-hosted contract:

1. install a clean instance;
2. configure the local administrator;
3. create a gallery;
4. upload and process photographs;
5. choose a cover and publish a private link;
6. browse and download as a visitor;
7. back up and restore both SQLite metadata and photo storage;
8. verify the restored installation and record caveats.

New requirements discovered during this gate must become follow-up work. They should not expand the beta scope opportunistically.

## Evidence completed

On Docker Desktop arm64:

- the multi-stage image builds successfully;
- native `better-sqlite3` dependencies compile in the builder stage;
- the final runtime starts as the non-root `node` user;
- the container applies all five SQLite migrations;
- the healthcheck becomes healthy;
- `/api/ready` returns HTTP 200;
- the Angular application is served from the NestJS process;
- `storage:verify` reports no missing or unreferenced objects;
- Docker Compose configuration and `git diff --check` pass.

The Docker context was also reduced by adding `.dockerignore`; local `node_modules`, build output, test artifacts, and runtime data are no longer sent to the image build.

## Container restore evidence

An isolated arm64 container exercise then completed the first beta workflow with synthetic PNG data:

- first administrator setup, gallery creation, upload, processing, cover selection, publication, and visitor access passed;
- the source container was stopped cleanly;
- SQLite and the complete photo-storage root were copied into new persistent directories;
- a new container restored both stores and passed `/api/ready`;
- `storage:verify` reported `checkedPhotos: 1`, `referencedObjects: 3`, `presentObjects: 3`, and no missing or unreferenced objects;
- confirmation-gated repair made no changes;
- the restored visitor session loaded the gallery and downloaded both the thumbnail and original successfully.

This validates the packaging and recovery shape with synthetic data on arm64. It does not replace representative camera, event-sized, reverse-proxy, or production-operator evidence.

The same Dockerfile also built successfully for `linux/amd64`, and the resulting emulated x64 container passed `/api/ready`. Architecture coverage is locally established for arm64 and amd64; host-specific performance remains unclaimed.

## Production-mode boundary evidence

The rebuilt image was exercised in a fresh `NODE_ENV=production` container:

- setup returned secure `HttpOnly` session and secure CSRF cookies;
- an unauthenticated administrator request returned 401;
- `/data/*` and `/photos/*` returned 404;
- an unapproved CORS origin received no CORS grant;
- readiness returned 200;
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy` were present;
- Express `X-Powered-By` fingerprinting was absent.

The probe is local production-mode evidence. TLS termination, forwarded headers, secure-cookie behavior through a real reverse proxy, and internet-facing direct-media checks remain open.

## Packaged workload evidence

The built image also processed a 20-file synthetic multipart batch on Docker Desktop arm64:

- 20 files were accepted;
- 20 files reached `ready` with no failures;
- upload acknowledgement took 83 ms;
- all derivatives were ready after 3,143 ms;
- sampled container memory was approximately 160 MiB.

The files were generated 1600×1200 JPEGs, so this is a packaged engineering baseline rather than evidence from camera originals or an event-sized Lino workload.

## Automated quality evidence

The complete local quality matrix passed after the release hardening changes:

- web and API unit tests: 15 tests passed;
- API end-to-end tests: 10 tests passed;
- packaged Playwright browser journey: passed;
- API linting, Angular Biome checks, and all formatting checks: passed;
- landing build: passed;
- whitespace validation: passed.

## Evidence still open

- representative camera files and an event-sized workload;
- reverse-proxy, secure-cookie, readiness, and direct-media checks;
- manual responsive, accessibility, and performance review;
- Lino workflow observation;
- OSS license decision before a meaningful stable release.

## Product decision

Do not implement selections, S3/R2, QR codes, SDK, MCP, PostgreSQL, hosted SaaS, or advanced branding during this gate. These remain evidence-gated follow-up capabilities.

## Next bounded work

Complete GAL-016 by recording the remaining workload, proxy, browser, and operator evidence, then execute GAL-017 without widening scope. Update [`release-matrix.md`](../release-matrix.md) with commands, environment, results, and unresolved risks.
