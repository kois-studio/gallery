# ADR 0012: Single-installation product packaging

- **Status:** Accepted for the first beta
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Gallery has separate Angular and NestJS source applications but must remain easy for a photographer to operate. The landing site and the product installation have different runtime requirements.

## Decision

The first product distribution is one Docker image and one application container exposing one HTTP port. The Angular production build is copied into the NestJS distribution and served by NestJS. The source applications remain separate at `apps/web` and `apps/api`; packaging them together does not create a microservice deployment.

The container uses two persistent mounts:

- `/data` for SQLite, sessions/configuration state, migrations, and durable job state; and
- `/photos` for originals, derivatives, and declared temporary/recovery objects.

The product container does not provide TLS termination. Internet-facing operators place a reverse proxy or equivalent TLS boundary in front of it. Vercel is used only for the separate `landing/` marketing/documentation site at `gallery.kois.app`; it is not a supported runtime for the persistent Gallery product or the first beta installation.

Development may run Angular’s dev server and NestJS separately with an explicit proxy. Production and self-hosting use the single packaged installation. The first supported distribution is Debian-based Node 24 Docker on x64 and arm64; Alpine is not part of the initial support contract because native dependency behavior must remain predictable.

## Consequences

The operator gets one image, one port, one documented deployment path, and two obvious backup roots. The product accepts the scaling limit of one application instance and one local storage root. A future reverse-proxy/static-asset split, object storage, or separately scaled worker requires measured demand and a new decision.

## Alternatives considered

- **Two operator-managed containers:** deferred because it adds deployment coordination without a current scaling or ownership need.
- **Vercel/serverless product deployment:** rejected because SQLite and local photo storage require durable filesystem access and long-lived processing behavior.
- **NestJS and Angular as microservices:** rejected because the source boundary is useful while independent operational services are not yet justified.
