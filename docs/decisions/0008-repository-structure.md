# ADR 0008: Separate landing site, product applications, and deployment concerns

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None
- **Superseded by:** None

## Context

Gallery has three related but different concerns:

1. a public marketing and documentation website for `gallery.kois.app`;
2. the Angular and NestJS applications that form the Gallery product; and
3. the self-hosting packaging that allows photographers to run the product on their own infrastructure.

Putting all of these files into one undifferentiated source tree would make deployment boundaries and contributor responsibilities unclear. Adding a `product/` wrapper or every future package would add nesting without creating a useful boundary.

## Decision

Gallery will use one repository with this structure:

```text
gallery/
├── apps/
│   ├── web/          Angular Gallery frontend
│   └── api/          NestJS Gallery backend
├── landing/          Astro marketing/documentation website
├── deploy/           self-hosting and deployment packaging
├── docs/             product and technical documentation
└── scripts/          repository-level automation when needed
```

The repository root represents the Gallery product. `apps/web` and `apps/api` are logical application boundaries, not automatically separate production services. The first self-hosted installation may package them together through one operator-facing deployment. The exact static-asset serving and container arrangement remains an implementation choice.

The `landing/` site has its own build and deployment lifecycle and is not part of the Gallery runtime. Shared `packages/` are not created until real shared code, a second consumer, or an independently useful release boundary justifies them.

## Consequences

- Contributors can find product frontend, backend, landing, deployment, and documentation concerns without a redundant `product/` directory.
- The marketing site can use Astro and Vercel without constraining the self-hosted product runtime.
- Angular and NestJS can evolve as explicit frontend/backend boundaries while remaining easy to package together.
- Self-hosting artifacts have a clear home without implying that every deployment concern is part of the backend source.
- A later shared contract or UI package can be added deliberately when duplication or a real consumer demonstrates the need.
- The repository contains multiple JavaScript/TypeScript applications, so package-manager and workspace decisions remain a separate implementation choice.

## Alternatives considered

- **Put everything under `product/`:** rejected because the repository root already represents the product and the wrapper adds no meaningful boundary.
- **Put the marketing site in a separate repository immediately:** deferred because the landing site is currently part of Gallery’s public presentation and can have an independent deployment without requiring repository separation.
- **Use top-level `frontend/` and `backend/` directories:** viable, but `apps/web` and `apps/api` make the distinction between deployable application roles and the separate `landing/` site clearer.
- **Create `packages/` for future SDK, MCP, UI, and shared core code now:** rejected because no real shared consumers or stable package releases exist yet.
