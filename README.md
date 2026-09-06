# Kois Gallery

Kois Gallery is a proposed open-source, self-hosted photo-delivery platform for photographers. It aims to provide beautiful client galleries while allowing each photographer to control their own deployment, storage, and data.

> Your photos. Your storage. Your infrastructure.

This repository is currently in the project-design phase. It contains the public product and technical context, not an implemented application. The repository is public for transparent design and development, but a final open-source license has not yet been selected; reuse rights should not be assumed until a license is published.

## Intended first workflow

1. A photographer creates a gallery.
2. They upload a batch of photographs.
3. Gallery processes browser-friendly variants.
4. The photographer chooses a cover and visibility.
5. They publish and share a URL or QR code.
6. Visitors browse, optionally select or favorite photographs, and download approved files.

The first real beta user is Lino Fajardo. His separate portfolio website will link to Gallery, but Gallery must remain an independent application and must not depend on Astro, Next.js, WordPress, or another photographer website framework.

## Current status

- Design documentation is being prepared before implementation.
- Self-hosted installation is the initial operating model.
- SQLite is the default metadata database direction.
- Local filesystem storage is the first storage target.
- S3-compatible storage is a later adapter target.
- Framework, authentication, image processing, upload, API, and license decisions remain open where documented.

## Documentation

Start with [`docs/AGENTS.md`](docs/AGENTS.md), then [`docs/README.md`](docs/README.md). Unfinished work is tracked in [`docs/work/TODO.md`](docs/work/TODO.md). The private Kois strategy context and brand implications remain in [`kois-context/projects/gallery.md`](https://github.com/kois-studio/kois-context/blob/main/projects/gallery.md).

## Planned repository shape

The final codebase is expected to be a monorepo only if the implementation needs multiple applications or packages. The design must not create empty packages or future integrations for appearance.

## Development status

No application code, deployment configuration, license, or production integration is claimed to exist yet.
