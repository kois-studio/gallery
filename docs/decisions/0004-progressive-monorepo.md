# ADR 0004: Progressive monorepo structure

- **Status:** Accepted for the project direction
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Gallery may eventually include a first-party web application, headless API, SDK, MCP server, storage adapters, examples, and shared UI. Creating all of those packages before consumers exist would create architecture theatre and increase maintenance cost.

## Decision

Gallery will use one repository. It will begin with the smallest deployable application and internal boundaries required by the first workflow. Additional apps and packages may be introduced when they have real code, consumers, or independently useful release boundaries.

## Consequences

Cross-cutting changes remain easy to coordinate, while premature package proliferation is avoided. Future extraction requires intentional dependency and release decisions. The repository structure must evolve from validated requirements rather than from the aspirational final tree.

## Alternatives considered

- Split API, web, SDK, MCP, and core repositories immediately: rejected because there are no independent consumers or stable contracts yet.
- Keep all future functionality in one unstructured application: rejected because the first implementation still needs explicit domain, storage, processing, and transport boundaries.
