# Proposed architecture overview

## Design status

This document describes proposed design, not implemented architecture. The repository currently contains no application code, framework files, runtime configuration, or deployment configuration.

The proposed first system is one self-hostable application with two logical application layers and explicit internal boundaries. The monorepo and module structure must grow only when an independent consumer, deployment need, or measured workload justifies it. Angular and NestJS are accepted as the framework direction; the implementation does not begin until lower-level choices are settled.

## Repository structure

The repository separates the public marketing surface from the product applications and their deployment concerns:

```text
gallery/
├── apps/
│   ├── web/          Angular product frontend
│   └── api/          NestJS product backend
├── landing/          Astro marketing/documentation website
├── deploy/           self-hosted packaging and deployment manifests
├── docs/             maintained project context
└── scripts/          repository-level tooling when required
```

`apps/web` and `apps/api` are two logical applications inside one product repository. A first self-hosted distribution may package them as one operator-facing installation with one documented deployment path, while keeping their transport and responsibility boundaries explicit. `landing/` is not part of the Gallery runtime: it is the public site that explains and markets the tool. Do not add a `product/` wrapper or empty `packages/` directory; the repository root already represents the product, and shared packages should appear only when real shared code justifies them.

## Recommended first shape

```text
Browser
  ├─ Angular administration and visitor application
  └─ browser state, forms, progress, and rendering
              ↓ versioned internal HTTP contract
        NestJS backend application
  ┌───────────┼────────────┐
  │           │            │
Access     Gallery/media  Delivery
  │           │            │
  └── application services and domain rules
              ↓
       persistence/infrastructure adapters
         SQLite + local object storage
         in-process durable job runner
```

Angular and NestJS are two logical layers, not a commitment to microservices or two operational environments. The supported installation may package both applications in one Docker/self-hosted deployment with the database and storage volumes. Whether the Angular build is served by NestJS, a reverse proxy, or another documented static-serving boundary remains a packaging choice. Image processing is initially an in-process worker with durable job rows in SQLite; a separate worker or queue is not part of the first contract.

The first beta path is intentionally limited to:

1. first administrator setup and sign-in;
2. creation of a draft gallery;
3. multi-file upload with per-file status;
4. immutable original storage and thumbnail/display derivatives;
5. cover selection;
6. publication through a revocable, unguessable share link;
7. responsive visitor browsing; and
8. individual original-file downloads.

Selections, password-protected galleries, public indexing, batch archives, expiration, QR generation, branding controls, S3, resumable uploads, and external APIs are separate increments unless Lino’s observed workflow makes one a beta gate. The proposed beta boundary is also recorded in [ADR 0005](../decisions/0005-proposed-first-beta-contract.md).

## Internal dependency direction

```text
Angular features and state
          ↓ HTTP DTO/contract boundary
NestJS controllers and transport adapters
          ↓
Application services and authorization policies
          ↓
Domain types and state transitions
          ↓
Repository, storage, and image-processing interfaces
          ↓
SQLite / local filesystem / selected image library
```

- Business rules must not be duplicated across Angular, NestJS, a future API, SDK, MCP server, or integrations.
- Angular must not be the authorization or persistence-invariant enforcement point; NestJS application/domain services remain authoritative.
- NestJS controllers must remain transport adapters, not the only enforcement point for authorization or domain invariants.
- Image binaries must not be stored in SQLite.
- Storage and processing interfaces must expose application needs, not provider-specific methods such as `getSignedUrl` as the universal contract.
- Future consumers and packages must be introduced only when a second real implementation or consumer justifies them.

## First application responsibilities

- **Configuration:** validate paths, URL, session settings, limits, and secrets before serving traffic.
- **Access:** authenticate the local administrator; authorize administrator operations; validate visitor gallery access; prevent direct unauthenticated media reads.
- **Gallery:** create drafts, validate publication readiness, choose a usable cover, publish/unpublish, and rotate access.
- **Media:** receive files through a bounded server-mediated upload, validate content, persist originals, enqueue durable processing, expose progress, and reconcile failures.
- **Delivery:** stream individual originals and derivatives only after the relevant access check; never expose storage paths as public URLs.
- **Operations:** health/readiness, structured safe logs, graceful shutdown, diagnostics, migrations, and recovery tooling/documentation.

Selection is not part of the first delivery slice because its visitor identity and persistence semantics are unresolved. If it is required for Lino’s beta, it must be implemented as a separate server-backed workflow rather than silently using browser-local state.

## Future consumers

```text
Web UI / headless frontend / SDK / MCP
              ↓
      Application and domain services
              ↓
       Database + storage adapters
```

The future diagram is a direction, not a commitment to an API, SDK, MCP server, or package split. None is justified by the current evidence.

## Technology status

The Angular + NestJS framework direction is accepted for Gallery in [ADR 0007](../decisions/0007-angular-nestjs-framework-direction.md), based on Gallery’s application complexity and David’s existing expertise. The generic Angular and NestJS profiles are selected from Engineering Standards 0.4.0 for implementation review; they do not prescribe this project decision. This does not accept a Node major version, package manager, ORM/query layer, authentication implementation, image-processing library, or final Docker/reverse-proxy packaging. SvelteKit and Go remain documented alternatives if concrete implementation evidence invalidates the Gallery decision. The comparison and remaining approval gates live in [questions.md](../questions.md); the proposed access model remains in [ADR 0006](../decisions/0006-proposed-local-auth-and-gallery-access.md).
