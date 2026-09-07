# Gallery unfinished work

This queue contains only unfinished implementation, verification, and release work. Durable decisions live in [`docs/decisions/`](../decisions/); deferred product questions live in [`docs/questions.md`](../questions.md).

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

The accepted product sequence is GAL-009 → GAL-010 → GAL-011 → GAL-012 → GAL-013 → GAL-014 → GAL-015 → GAL-016 → GAL-017. GAL-008 established the runtime foundation and is recorded in the implementation checkpoint. GAL-005 is an independent OSS-release gate and is not an implementation prerequisite.

### [GAL-005] [P1] [oss] Choose and publish a license before the first meaningful public release

- **Status:** Blocked
- **Goal:** Publish Gallery under an explicit license compatible with its intended adoption model.
- **Scope:** Compare AGPLv3, Apache 2.0, and other justified candidates against adoption goals, network use, and dependency obligations; record the decision and add the license file.
- **Non-goals:** Do not add a misleading placeholder license.
- **Acceptance criteria:** The trade-off is documented, an ADR records the decision, the selected license is present, and README wording matches the actual release status.
- **Verification:** Dependency/license review and repository inspection.
- **Dependencies:** None
- **Blocker or question:** David/Kois decision required before release.
- **Next action:** Prepare the license comparison without treating it as settled.

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
- **Verification:** Setup re-entry, password hashing, session authorization, CSRF, logout revocation, invalid credentials, and recovery command implementation are covered; expiry and full brute-force behavior remain release verification work.
- **Dependencies:** GAL-009 and ADR 0006.
- **Blocker or question:** None beyond the preceding slice.
- **Next action:** Continue with GAL-011; retain expiry, recovery-exercise, and deployment checks for GAL-016/GAL-017.

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
- **Verification:** Synthetic workload, malformed/oversized files, processing retry, cancellation, restart, storage-full, processing-failure, and concurrency tests on x64 and arm64 containers. A deterministic 20-file 1600×1200 synthetic baseline exists; representative camera and architecture-specific evidence remain open. Upload idempotency is not yet part of the first request contract.
- **Dependencies:** GAL-011 and ADR 0011.
- **Blocker or question:** None; measurements may produce a later limits decision.
- **Next action:** Run representative camera workload, storage-failure, architecture-specific, and restore verification; use `npm run storage:verify` during the restore exercise.

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
- **Next action:** Record responsive/accessibility/performance evidence, then prepare GAL-016’s release matrix.

### [GAL-016] [P0] [verification] Complete release verification and operator documentation

- **Status:** Blocked
- **Goal:** Prepare a truthful beta candidate with reproducible checks and executable recovery instructions.
- **Scope:** CI quality gates, critical-journey/security matrix, workload record, setup/upgrade/runbook updates, standards-contract updates, and restore-drill preparation.
- **Non-goals:** Do not claim a successful restore or beta readiness before GAL-017.
- **Acceptance criteria:** Clean install/build/test/security commands run or are marked unrun; current docs describe implemented behavior; the synthetic workload and recovery procedure are executable.
- **Verification:** CI inspection, clean-container checks, tests, documentation/link validation, the synthetic local restore e2e, and readiness review for GAL-017.
- **Dependencies:** GAL-008 through GAL-015.
- **Blocker or question:** Release evidence remains incomplete until the restore gate passes.
- **Next action:** Run the CI quality gates, execute the storage-integrity command against a restored clean installation, and assemble the remaining verification matrix for GAL-017.

### [GAL-017] [P0] [release] Execute beta verification and restore gate

- **Status:** Blocked
- **Goal:** Demonstrate that the first release meets the delivery, security, and recovery contract.
- **Scope:** End-to-end setup/upload/process/publish/browse/download/unpublish/rotation, negative tests, synthetic workload, clean-install restore of SQLite plus storage, reconciliation, and operator verification.
- **Non-goals:** Do not expand product scope during the gate; record new requirements as deferred work.
- **Acceptance criteria:** The critical journey passes; both stores restore into a compatible clean installation; derivatives/downloads work after restore; missing derivatives, missing originals, unreferenced objects, and in-flight jobs produce documented outcomes; failures and caveats are recorded.
- **Verification:** Synthetic or explicitly approved assets only; record commands, environment, results, and unresolved risks.
- **Dependencies:** GAL-016 and the accepted recovery contract in `docs/operations/backup-recovery.md`.
- **Blocker or question:** This is a post-implementation gate.
- **Next action:** Run the container-level/operator restore gate after GAL-016; the automated local synthetic restore is now evidence, not a substitute for that gate.
