# ADR 0002: Separate portfolio website and Gallery application

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Lino Fajardo needs a public photography portfolio, while Gallery is intended to become a reusable product for photographers. Combining the two would make Gallery depend on one photographer’s website and would make the portfolio responsible for product infrastructure.

## Decision

`linofajardo-web` and `gallery` remain separate repositories and applications. The website may link to Gallery through stable public URLs such as `gallery.linofajardo.com`. They may share visual language, but shared code is deferred until a real reuse boundary exists.

## Consequences

Each application has a clear scope and release cycle. The first integration can be a manually configured link, avoiding premature API coupling. A later headless API or embedding model must be justified by more than the first website.

## Alternatives considered

- Build Gallery into the Lino website: rejected because it would not be reusable or framework-independent.
- Create a shared monorepo for both applications: rejected because the products have different ownership, deployment, and lifecycle boundaries.
