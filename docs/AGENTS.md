# Gallery project agent instructions

## Session mode

This project is now in `project-implementation` mode. Use focused sessions for explicit tickets and bounded advance sessions for autonomous progress. Do not touch `landing/` from product implementation sessions.

## Read first

1. Read this file.
2. Read [`docs/README.md`](README.md).
3. Read [`docs/project-standards.yml`](project-standards.yml).
4. Read the relevant product, architecture, operations, decisions, questions, and work-queue documents.
5. Read the repository root `README.md` for the public project status.

## Source-of-truth boundaries

- Product definition, users, workflows, non-goals, and public product intent: [`docs/product/`](product/).
- Proposed architecture, trust boundaries, data, storage, and lifecycle: [`docs/architecture/`](architecture/).
- Self-hosting, configuration, backup, recovery, and operator responsibilities: [`docs/operations/`](operations/).
- Durable Gallery architectural decisions: [`docs/decisions/`](decisions/).
- Unresolved choices and questions: [`docs/questions.md`](questions.md).
- Unfinished work and design tasks: [`docs/work/TODO.md`](work/TODO.md).
- Kois-wide private strategy, brand implications, legal working context, and portfolio decisions: the private [`kois-context`](https://github.com/kois-studio/kois-context) repository.

This public repository MUST NOT copy private Kois strategy, private relationships, private photography assets, real client records, credentials, or sensitive personal information.

## Design-state rules

- Label proposed architecture as proposed design, not implementation fact.
- Record durable technical decisions as ADRs.
- Keep unresolved questions visible; do not silently choose high-impact architecture, authentication, storage, deployment, or licensing decisions.
- The Angular + NestJS framework direction and implementation gates are accepted in ADRs 0007–0012. Keep implementation aligned with those decisions; record any material change as a new ADR.
- GAL-008 through GAL-015 have established the current product slice; GAL-012, GAL-016, and GAL-017 remain active for reliability, release evidence, and container/operator verification.
- Treat Lino's workflow as a validation source, not as a reason to make Gallery Lino-specific.
- Do not add SDK, MCP, framework adapters, PostgreSQL support, or hosted SaaS architecture before a real consumer or requirement justifies it.

## Implementation-state rules for later

When implementation begins, use `project-implementation` mode from the Engineering Standards repository. Use `focused` sessions for explicit tickets and `advance` sessions for bounded autonomous progress. Keep unfinished work in `docs/work/TODO.md`, update current-state documentation when behavior changes, and record unrun checks honestly.

## Privacy and security

Use synthetic or explicitly approved assets for tests and examples. Never commit real private galleries, client photographs, credentials, access keys, tokens, or sensitive configuration. Self-hosted deployment transfers operational responsibility to the photographer, but the software and documentation must still describe security boundaries, safe defaults, backup expectations, and update responsibilities.
