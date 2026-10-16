# Gallery unfinished work

This queue contains only unfinished implementation, verification, and release work. Durable decisions live in [`docs/decisions/`](../decisions/); deferred product questions live in [`docs/questions.md`](../questions.md).

## Current delivery mode

Gallery is a working vertical slice heading for its first real delivery. The 2026-10-17 review ([checkpoint](checkpoints/2026-10-17-workflow-review.md)) found that the frozen scope could not survive a normal photographer workflow, so the scope freeze is lifted. The fixes listed in that checkpoint are implemented, and the next priority is one real event delivered with Lino (GAL-018), not further synthetic evidence. Record friction from that delivery as new work items.

## Public landing track

### [LANDING-001] [P1] [web] Publish the Gallery marketing and documentation site

- **Status:** Active
- **Goal:** Explain the current self-hosted Gallery product clearly and direct interested users to the repository and setup guide.
- **Scope:** Independent static Astro site, responsive presentation, current-capability/future-capability boundary, metadata, GitHub and Kois links, and an independently verifiable Vercel deployment.
- **Non-goals:** Do not implement product functionality here; do not claim a published license, hosted SaaS, S3 support, selections, SDK, or MCP availability before those capabilities are accepted and verified.
- **Acceptance criteria:** Astro build and formatting pass; the page works at desktop and mobile widths; copy matches the root README and product docs; unsupported capabilities remain explicitly future work; deployment configuration is documented when the external project is connected.
- **Verification:** `npm run build:landing`, `npm run format:landing:check`, local rendered inspection, and deployment verification.
- **Dependencies:** Current product README and self-hosting guide.
- **Blocker or question:** Vercel account/project access is required for the final deployment step.
- **Next action:** Complete local visual/accessibility review, then configure the production deployment when access is available.

## First-release sequence

The accepted product sequence is GAL-009 → GAL-010 → GAL-011 → GAL-012 → GAL-013 → GAL-014 → GAL-015 → GAL-016 → GAL-017. GAL-008 established the runtime foundation and is recorded in the implementation checkpoint. GAL-005 (license) is complete: MIT, ADR 0014.

### [GAL-009] [P0] [data] Implement SQLite schema and migrations

- **Status:** Completed
- **Goal:** Establish the smallest authoritative metadata model and repeatable migration path.
- **Scope:** Administrator, session, gallery, photo, and processing-job tables; constraints, indexes, parameterized repositories, numbered SQL migrations, migration runner, clean-install path, and upgrade checks.
- **Non-goals:** Do not add selections, tenancy, expiration, PostgreSQL, or provider-specific schema.
- **Acceptance criteria:** Empty databases migrate deterministically; reruns are safe; required foreign-key, uniqueness, state, and publication invariants are represented; migration failure behavior is tested.
- **Verification:** Empty migration and repeat-run tests pass. Upgrade and failure-path coverage remain part of later schema evolution.
- **Dependencies:** Completed GAL-008 foundation and ADR 0010.
- **Blocker or question:** None beyond the preceding slice.
- **Next action:** Continue with GAL-010; add upgrade/failure coverage when the schema evolves.

### [GAL-010] [P0] [security] Implement first-admin setup and sessions

- **Status:** Completed
- **Goal:** Provide the local administrator authentication boundary required for privileged operations.
- **Scope:** Armed one-time setup, Node built-in scrypt password hashing, server-side opaque sessions, expiry/revocation, sign-in/out, CSRF protection, safe errors, rate limiting appropriate to one installation, and local operator password recovery.
- **Non-goals:** Do not add external identity, visitor accounts, organizations, MFA, or email recovery.
- **Acceptance criteria:** Setup cannot be reopened after use; valid sessions authorize administration; malformed, expired, revoked, and unauthenticated sessions fail; recovery requires local operator access, invalidates sessions, and is not an HTTP endpoint.
- **Verification:** Setup re-entry, password hashing, session authorization, CSRF, logout revocation, invalid credentials, expired sessions, throttled failed sign-ins, and recovery command implementation are covered; production deployment-security checks remain open.
- **Dependencies:** GAL-009 and ADR 0006.
- **Blocker or question:** None beyond the preceding slice.
- **Next action:** Continue with GAL-011; retain recovery-exercise and deployment checks for GAL-016/GAL-017.

### [GAL-011] [P0] [gallery] Implement gallery creation and local storage

- **Status:** Completed
- **Goal:** Let an authenticated administrator create a draft gallery and persist originals behind the local storage boundary.
- **Scope:** Draft metadata, server-generated IDs/keys, local-root validation, safe temporary writes, atomic finalization where supported, object ownership, and administrator listing/editing.
- **Non-goals:** Do not add S3, public indexing, expiration, archives, or extensive branding.
- **Acceptance criteria:** Draft CRUD is validated and authorized; keys cannot escape the configured root; raw client paths never become storage paths; local writes are atomic and symlink-aware.
- **Verification:** Authorization, traversal, symlink, duplicate-slug, invalid-input, and atomic-write tests pass. Interrupted-write and unavailable-storage exercises remain release verification work.
- **Dependencies:** GAL-009 and GAL-010.
- **Blocker or question:** None beyond the preceding slices.
- **Next action:** Continue with GAL-012; retain storage-full and interrupted-write exercises for the media/release verification slices.

### [GAL-012] [P0] [media] Implement upload state and durable processing

- **Status:** Active
- **Goal:** Upload the accepted representative batch without silent loss and process it through observable restartable states.
- **Scope:** Server-mediated multipart upload, JPEG/PNG/WebP validation, 100 MiB per-file limit, 500-file/10 GiB batch limits, 100-megapixel decoded-area limit, durable jobs, two-job concurrency, retries, cancellation, restart reconciliation, and abandoned temporary-file cleanup.
- **Non-goals:** Do not add RAW/HEIC, direct-to-storage, resumable protocols, or a separate queue unless measured evidence changes the decision.
- **Acceptance criteria:** Every file reports success, rejection, retryable failure, or cancellation; originals survive derivative failure; retries are idempotent; shutdown and restart preserve observable work.
- **Verification:** Synthetic workload, malformed/oversized files, processing retry, cancellation, restart, storage-full, processing-failure, and concurrency tests on x64 and arm64 containers. Deterministic 20-file baselines and arm64/amd64 startup evidence exist; representative camera and host-specific performance evidence remain open. Upload idempotency is not yet part of the first request contract.
- **Dependencies:** GAL-011 and ADR 0011.
- **Blocker or question:** None; measurements may produce a later limits decision.
- **Next action:** Run representative camera workload and storage-failure verification; use `storage:verify` and approved `storage:repair` during any operator-approved restore exercise. The web client now uploads one file per request (three in parallel, network failures retried), failed photos can be retried or deleted, and failed or cancelled photos no longer block publication (ADR 0013).

### [GAL-013] [P0] [media] Generate derivatives and select a cover

- **Status:** Completed
- **Goal:** Make validated media usable for browsing and publication.
- **Scope:** Sharp inspection, EXIF orientation, metadata-stripped WebP thumbnail/display variants, deterministic keys, retry-safe finalization, readiness, and usable-photo cover selection.
- **Non-goals:** Do not add editing, RAW cataloging, arbitrary transformations, or provider-specific optimization.
- **Acceptance criteria:** Required variants are generated only from validated originals; incomplete variants are never marked ready; failures are observable/retryable; cover selection rejects incomplete media.
- **Verification:** Real-image upload through queued processing, Sharp derivative generation, retry/restart state handling, and ready-only cover selection are covered. Representative camera workload and missing-object exercises remain release verification work.
- **Dependencies:** GAL-012 and ADR 0011.
- **Blocker or question:** None beyond workload verification.
- **Next action:** Continue with GAL-014; retain representative camera/workload measurements for GAL-016/GAL-017.

### [GAL-014] [P0] [security] Implement private share-link delivery and authorization

- **Status:** Completed
- **Goal:** Publish a ready gallery privately through a revocable bearer link with server-side authorization.
- **Scope:** Publication readiness, high-entropy token generation/storage, scoped visitor access, unpublish/rotation, gallery-scoped checks, safe referrer/log behavior, and protected derivative/original routes.
- **Non-goals:** Do not add visitor accounts, visitor passwords, public indexing, or multi-tenant authorization.
- **Acceptance criteria:** Ready galleries can publish, share, unpublish, and rotate; invalid, revoked, unpublished, cross-gallery, direct-storage, and malformed requests fail; tokens and private media are not leaked.
- **Verification:** End-to-end coverage includes ready-only publication, invalid links, scoped visitor sessions, protected derivatives/originals, token rotation, old-session revocation, and unpublish revocation. Full matrix, expiry, referrer, and brute-force checks remain release verification work.
- **Dependencies:** GAL-013, GAL-010, and ADR 0006.
- **Blocker or question:** None beyond the accepted access model.
- **Next action:** Continue with GAL-015; retain the full authorization matrix and production proxy checks for GAL-016/GAL-017.

### [GAL-015] [P0] [web] Implement visitor browsing and individual downloads

- **Status:** Active
- **Goal:** Complete the usable visitor delivery journey without exposing originals during browsing.
- **Scope:** Responsive Angular gallery grid, derivative delivery, larger view, loading/empty/error/retry states, keyboard/focus behavior, accessibility, and authorized streaming of individual originals.
- **Non-goals:** Do not add archives, selection submission, QR generation, or extensive branding.
- **Acceptance criteria:** Visitors browse a representative gallery on mobile and desktop; derivatives are used for viewing; authorized visitors can download one original; unauthorized requests fail; private metadata and storage paths remain hidden.
- **Verification:** Angular build/tests, API authorization coverage, Playwright critical journey, keyboard/manual accessibility, responsive checks, large-file streaming, and Lighthouse/equivalent audit. Manual and performance evidence remain open.
- **Dependencies:** GAL-014 and GAL-013.
- **Blocker or question:** Final browser/performance targets are release evidence, not a reason to expand scope silently.
- **Next action:** The visitor page now uses a cover hero, aspect-preserving justified rows, a keyboard/swipe lightbox with focus management, Range-capable original downloads, and stable bookmarkable share URLs; the Playwright journey covers it. Manual screen-reader and real-device review plus a Lighthouse pass remain open.

### [GAL-016] [P0] [verification] Complete release verification and operator documentation

- **Status:** Active
- **Goal:** Prepare a truthful beta candidate with reproducible checks and executable recovery instructions.
- **Scope:** CI quality gates, critical-journey/security matrix, workload record, setup/upgrade/runbook updates, standards-contract updates, and restore-drill preparation.
- **Non-goals:** Do not claim a successful restore or beta readiness before GAL-017.
- **Acceptance criteria:** Clean install/build/test/security commands run or are marked unrun; current docs describe implemented behavior; the synthetic workload and recovery procedure are executable.
- **Verification:** [`release-matrix.md`](release-matrix.md), CI inspection, clean-container checks, tests, documentation/link validation, the synthetic local restore e2e, storage verification/repair evidence, and readiness review for GAL-017.
- **Dependencies:** GAL-008 through GAL-015.
- **Blocker or question:** Release evidence remains incomplete until the representative workload, browser review, production-proxy checks, and operator behavior pass or are explicitly documented as caveats.
- **Next action:** Use the disposable local setup/demo flows for product and operator review. Then use the documented Caddy recipe and loopback-only container binding as the baseline for a real reverse-proxy/TLS verification. Assemble the remaining GAL-017 evidence: representative workload, browser review, and operator-facing caveats. Do not expand the product scope during this work.

### [GAL-017] [P0] [release] Execute beta verification and restore gate

- **Status:** Blocked
- **Goal:** Demonstrate that the first release meets the delivery, security, and recovery contract.
- **Scope:** End-to-end setup/upload/process/publish/browse/download/unpublish/rotation, negative tests, synthetic workload, clean-install restore of SQLite plus storage, reconciliation, and operator verification.
- **Non-goals:** Do not expand product scope during the gate; record new requirements as deferred work.
- **Acceptance criteria:** The critical journey passes; both stores restore into a compatible clean installation; derivatives/downloads work after restore; missing derivatives, missing originals, unreferenced objects, and in-flight jobs produce documented outcomes; failures and caveats are recorded.
- **Verification:** Synthetic or explicitly approved assets only; record commands, environment, results, and unresolved risks.
- **Dependencies:** GAL-016 and the accepted recovery contract in `docs/operations/backup-recovery.md`.
- **Blocker or question:** This is a post-implementation gate.
- **Next action:** Execute the remaining beta gates after GAL-016: representative workload, reverse-proxy/security, browser, and operator review. The synthetic container restore and local production-mode probe are evidence, not substitutes for those gates.

## Real-use track

### [GAL-018] [P0] [validation] Deliver one real event with Lino

- **Status:** Ready
- **Goal:** Replace synthetic evidence with one real delivery: real camera files, real clients, real devices.
- **Scope:** Choose an event Lino can share, run Gallery on infrastructure David controls (a VPS behind the documented Caddy recipe, or a temporary tunnel), upload the full set, send the link, and record upload/processing time, client devices, questions, and failures.
- **Non-goals:** Do not build selections, archives, or branding before this delivery shows they are needed.
- **Acceptance criteria:** Lino's clients open and download photos from a real link; every friction point is recorded as a work item or a closed question.
- **Verification:** A short delivery report in `docs/work/checkpoints/` with measurements and observations, and no private photos or client data in the repository.
- **Dependencies:** Lino's availability and an approved event.
- **Blocker or question:** Needs David and Lino.
- **Next action:** Pick the event and the hosting path.

### [GAL-019] [P2] [media] Regenerate derivatives for existing installations

- **Status:** Proposed
- **Goal:** Let an operator regenerate thumbnails, display images, dimensions, and capture times after a derivative contract change.
- **Scope:** A confirmation-gated maintenance command that requeues ready photos for processing.
- **Non-goals:** Do not change originals.
- **Acceptance criteria:** Photos processed before migration 0006 gain aspect-preserving thumbnails, display-oriented dimensions, and capture times.
- **Verification:** Unit test plus a restore-style e2e.
- **Dependencies:** None.
- **Blocker or question:** Only worth building once a real installation predates the change; no such installation exists yet.
- **Next action:** Revisit if an installation needs it.
