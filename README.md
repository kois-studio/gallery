# Kois Gallery

Kois Gallery is an open-source, self-hosted photo-delivery platform for photographers. It aims to provide beautiful client galleries while allowing each photographer to control their own deployment, storage, and data.

> Your photos. Your storage. Your infrastructure.

The project design gates are complete and the runtime foundation is implemented. The repository is public for transparent design and development, but a final open-source license has not yet been selected; reuse rights should not be assumed until a license is published.

## Intended first workflow

1. A photographer creates a gallery.
2. They upload a batch of photographs.
3. Gallery processes browser-friendly variants.
4. The photographer chooses a cover and visibility.
5. They publish and share a private, revocable URL.
6. Visitors browse and download individual originals; server-backed selections are a separate beta gate based on Lino’s observed workflow.

The first real beta user is Lino Fajardo. His separate portfolio website will link to Gallery, but Gallery must remain an independent application and must not depend on Astro, Next.js, WordPress, or another photographer website framework.

There are two intentionally different deployment targets around the project:

- `gallery.kois.app` is the public Gallery marketing and documentation site, deployed independently and expected to use Astro and Vercel.
- `gallery.linofajardo.com` is the first real Gallery installation, using the self-hosted product deployment described in `docs/operations/`.

Photographers who adopt Gallery run the same product on infrastructure they control. A future Kois-managed hosted service would be a separate operating model and is not part of this repository’s first-release contract.

## Current status

- Design gates are resolved; GAL-008 foundation is implemented and domain slices are pending.
- Self-hosted installation is the initial operating model.
- SQLite is the default metadata database direction.
- Local filesystem storage is the first storage target.
- S3-compatible storage is a later adapter target.
- Angular + NestJS, Node 24/npm 11, plain SQL with `better-sqlite3`, Sharp, and single-container self-hosting are accepted for the first beta. Deferred product and release questions remain documented.

## Documentation

Start with [`docs/AGENTS.md`](docs/AGENTS.md), then [`docs/README.md`](docs/README.md). Unfinished work is tracked in [`docs/work/TODO.md`](docs/work/TODO.md). The private Kois strategy context and brand implications remain in [`kois-context/projects/gallery.md`](https://github.com/kois-studio/kois-context/blob/main/projects/gallery.md).

## Planned repository shape

Gallery uses one repository with separate top-level concerns:

```text
gallery/
├── apps/
│   ├── web/          Angular Gallery frontend
│   └── api/          NestJS Gallery backend
├── landing/          Astro marketing and documentation website
├── deploy/           self-hosting and deployment packaging
├── docs/             product, architecture, operations, and agent context
└── scripts/          repository-level validation and automation when needed
```

The Angular frontend and NestJS backend are logical application boundaries. They may be packaged into one self-hosted installation; this is not a commitment to microservices or separate operator-managed deployments. `landing/` has a separate public-website lifecycle and must not be confused with the Gallery product frontend. Shared packages should be added only when real shared code or an independent consumer justifies them.

## Development status

The runtime foundation is implemented; beta readiness, production integration, and the OSS license are not yet claimed.
