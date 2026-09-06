# Gallery unfinished work

### [GAL-001] [P0] [workflow] Observe and document Lino’s first real delivery workflow

- **Status:** Ready
- **Origin:** human / product design
- **Goal:** Establish the first real event workflow Gallery must support.
- **Why now:** The product must be shaped by real photo volumes and delivery friction rather than feature assumptions.
- **Scope:** Observe upload, processing, sharing, browsing, selections, downloads, and recovery needs with Lino.
- **Non-goals:** Do not commit to a broad photographer-management product.
- **Acceptance criteria:**
  - The workflow, actors, inputs, outputs, and failure points are documented.
  - Real data is not copied into the public repository.
  - Product priorities are updated with evidence.
- **Verification:** Review with Lino and record approved synthetic or public test-asset requirements.
- **Affected areas:** `docs/product/`, `docs/questions.md`
- **Dependencies:** Lino availability and permission boundaries.
- **Risks:** Generalizing from one person or one event too early.
- **Blocker or question:** None
- **Next action:** Prepare an observation guide and synthetic test dataset plan.
- **Owner:** Kois product/engineering
- **Last updated:** 2026-09-06

### [GAL-002] [P0] [architecture] Select the first runtime and application shape

- **Status:** Proposed
- **Origin:** architecture design
- **Goal:** Choose the smallest reliable stack for the first vertical slice.
- **Why now:** Implementation scaffolding should not begin while the runtime and deployment model are ambiguous.
- **Scope:** Compare viable full-stack/runtime options against self-hosting, SQLite, local storage, image processing, testing, and future headless needs.
- **Non-goals:** Do not optimize for future SDK or MCP support before a first consumer exists.
- **Acceptance criteria:**
  - A short comparison records constraints, trade-offs, and recommendation.
  - The selected stack has an ADR or explicit proposed status.
  - The choice can support clean Docker-based development.
- **Verification:** Review the comparison against the first vertical slice and standards contract.
- **Affected areas:** `docs/architecture/`, `docs/decisions/`, `docs/questions.md`
- **Dependencies:** GAL-001
- **Risks:** Choosing a familiar framework rather than the smallest operationally sound one.
- **Blocker or question:** None
- **Next action:** Compare no more than three realistic stacks.
- **Owner:** David / technical lead
- **Last updated:** 2026-09-06

### [GAL-003] [P0] [security] Define the first authentication and access model

- **Status:** Proposed
- **Origin:** architecture/security design
- **Goal:** Define administrator authentication and visitor access for a self-hosted installation.
- **Why now:** Access control affects the data model, deployment, UI, URLs, and security tests.
- **Scope:** First-admin setup, credentials, sessions, protected galleries, password handling, authorization, and recovery boundaries.
- **Non-goals:** Do not add multi-tenant SaaS identity or external provider dependency without a decision.
- **Acceptance criteria:**
  - Trust boundaries and ownership are documented.
  - Allowed and denied paths are listed.
  - The first implementation can be tested without Kois infrastructure.
- **Verification:** Threat review and proposed negative-test matrix.
- **Affected areas:** `docs/architecture/boundaries.md`, `docs/questions.md`
- **Dependencies:** GAL-001, GAL-002
- **Risks:** Treating self-hosting as eliminating security responsibility.
- **Blocker or question:** None
- **Next action:** Produce an authentication decision comparison.
- **Owner:** David / technical lead
- **Last updated:** 2026-09-06

### [GAL-004] [P1] [media] Define image-processing and upload reliability behavior

- **Status:** Proposed
- **Origin:** product/architecture design
- **Goal:** Define observable states and failure handling for event-sized uploads.
- **Why now:** Silent failures or unrecoverable processing would undermine the product’s core promise.
- **Scope:** upload states, retries, cancellation, variants, validation, restart behavior, orphan cleanup, and resource limits.
- **Non-goals:** Do not select a library before representative workload constraints are known.
- **Acceptance criteria:**
  - State transitions and failure behavior are documented.
  - Representative test inputs and measurements are defined.
  - Publication behavior for incomplete processing is explicit.
- **Verification:** Design review and later batch-upload test plan.
- **Affected areas:** `docs/architecture/media-pipeline.md`, `docs/questions.md`
- **Dependencies:** GAL-001, GAL-002
- **Risks:** Overengineering workers before measuring the first workload.
- **Blocker or question:** None
- **Next action:** Define representative synthetic photo batches.
- **Owner:** David / technical lead
- **Last updated:** 2026-09-06

### [GAL-005] [P1] [oss] Choose a license before the first meaningful public release

- **Status:** Blocked
- **Origin:** OSS design
- **Goal:** Publish Gallery under an explicit license compatible with its intended adoption model.
- **Why now:** Public visibility does not grant reuse rights.
- **Scope:** Compare AGPLv3, Apache 2.0, and other justified candidates against goals, dependencies, and network use.
- **Non-goals:** Do not add a misleading placeholder license.
- **Acceptance criteria:**
  - The trade-off is documented.
  - The decision is recorded in an ADR.
  - The selected license is present before claiming an open-source release.
- **Verification:** Dependency/license review and repository inspection.
- **Affected areas:** root `LICENSE`, `README.md`, `docs/decisions/`
- **Dependencies:** None
- **Risks:** Ambiguous reuse rights or incompatible dependency obligations.
- **Blocker or question:** David/Kois decision required before release.
- **Next action:** Prepare a license comparison without treating it as settled.
- **Owner:** Kois
- **Last updated:** 2026-09-06
