# Deferred Gallery questions

The implementation gates are resolved in ADRs 0005–0012. This document now contains only questions that remain deliberately deferred, evidence requests, and future product decisions. It is not a second architecture source of truth.

## First-beta evidence

- Observe Lino’s real event workflow and record whether server-backed visitor selections are required to complete the beta job.
- Run the synthetic workload described in [GAL-012](work/TODO.md) against the accepted JPEG/PNG/WebP contract and initial limits.
- Verify the accepted Node 24, Sharp, `better-sqlite3`, Docker, x64, and arm64 combination with clean installs and production builds.
- Exercise the remaining authorization/deployment matrix, including production cookie behavior, reverse-proxy headers, direct media paths, path traversal, malformed files, and approved storage-failure scenarios. Setup re-entry, session expiry, CSRF, share-token rotation, cross-gallery access, and failed-login throttling are covered locally.
- Execute the two-store restore drill before calling the product beta-ready.

## Product decisions deferred after the first slice

- Are server-backed visitor selections required for Lino’s real beta? If so, define identity, persistence, submission, retrieval, retention, and export behavior in a new ADR.
- Is individual-original download sufficient, or is an asynchronous bounded archive required? If required, define limits, expiry, cleanup, and authorization.
- Does a real client workflow require a retry-safe batch idempotency key, or is explicit per-file retry sufficient for the first beta?
- Is expiration required, and what exactly expires: access, metadata, originals, or derivatives?
- Are visitor passwords required in addition to bearer links?
- Which branding controls are essential for the first real user?

## Toolchain

- ADR 0009 selects npm 11, while the maintainer's workspace convention prefers Bun for installs and scripts. The root scripts currently call `npm --prefix` and fail under `bun run`. Decide whether to keep npm (and document the exception) or migrate root orchestration, CI, and the Docker build to Bun after confirming that `better-sqlite3` and `sharp` install cleanly; record the outcome as an ADR.

## Media follow-ups

- Should a third, roughly 1600px derivative be added so phones do not load the 2400px display image in the lightbox? Measure real camera files during GAL-018 first.

## Operations and release

- What backup frequency, retention, encryption, replication, RPO, and RTO should operators choose? Gallery must not publish numeric guarantees without evidence.
- Which reverse-proxy recipes and host platforms deserve documentation after the first supported Docker path works?
- Which contribution, security-reporting, release, and compatibility promises are sustainable?

## Future expansion

- When does S3-compatible storage justify a second provider adapter?
- When does a stable external API justify a headless consumer, SDK, or MCP server?
- When do multiple administrators or photographers justify ownership, roles, and tenancy semantics?
- What measured workload or operational constraint would justify PostgreSQL, a separate worker, resumable uploads, or multiple application instances?
