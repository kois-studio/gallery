# ADR 0007: Angular + NestJS framework direction

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None
- **Superseded by:** None

## Context

Gallery is a full-stack application with photographer administration, authenticated operations, persistence, local files, image-processing jobs, private media delivery, and HTTP contracts. It is not a simple content-focused website and is not only an interactive browser application without a project-owned backend.

Engineering Standards 0.4.0, revision `3e3d423`, provides generic Angular and NestJS technology profiles. It is project-agnostic and does not prescribe Gallery’s stack. David has selected Angular + NestJS for Gallery because the first release has owned domain logic, persistence, authentication, files, jobs, and HTTP contracts, and because he has existing Angular/NestJS expertise. The application may still be packaged as one self-hosted Docker installation.

## Decision

Gallery will use Angular as the frontend/application framework and NestJS as the backend application framework for the first release and its initial evolution.

This is a framework-direction decision, not a microservices decision. Angular and NestJS are two logical application layers with an explicit HTTP contract and dependency direction:

```text
Angular UI/state → HTTP DTO contract → NestJS transport
                                      → application/domain services
                                      → persistence/storage/processing adapters
```

The layers MAY be packaged together in one Docker/self-hosted installation. The project does not require separate operational environments, independently scaled services, or premature package/service extraction.

The remaining implementation conventions are recorded in ADRs 0009–0012. They refine this framework decision without changing the Angular/NestJS direction.

## Consequences

The project records a Gallery-specific framework decision and can use the generic Angular and NestJS profiles as implementation review contracts. It gains an explicit frontend/backend boundary suitable for future headless consumers without creating those consumers now. It also accepts additional DTO, contract-testing, deployment, and state-coordination work compared with a single full-stack framework.

The first installation can remain operationally simple: one Docker deployment, one NestJS runtime, one SQLite database, and one local storage root. The boundary must remain testable and clear even when packaged together.

## Alternatives considered

- **SvelteKit + Node:** retained as a documented alternative, but not selected because David’s Gallery-specific decision favors Angular + NestJS for the owned backend responsibilities and existing team expertise.
- **Go monolith:** retained as a documented alternative, but not selected because no concrete operational or runtime advantage has yet been demonstrated for the first Gallery workload.
- **Angular only without NestJS:** rejected for the first release because Gallery owns backend domain logic, persistence, authentication, files, jobs, and private media delivery.
- **Separate microservices:** rejected because no independent deployment, scale, or ownership boundary justifies the operational complexity.

## Unresolved risks

- The frontend/backend boundary may add delivery overhead before Gallery has a second consumer; the first release must keep it within one deployment shape.
- Workload evidence may require later adjustments to limits or adapters, but it must not silently change the product boundary.
- If measured workload or operator constraints demonstrate a concrete Go advantage, a superseding ADR may be appropriate.
