# ADR 0001: Self-hosted-first product boundary

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Gallery is intended to help photographers deliver galleries without requiring Kois to operate a recurring hosted service or store all photographer media. Kois is currently a portfolio-first practice with limited operational capacity.

## Decision

Gallery will initially be distributed as self-hosted software. Photographers or their chosen infrastructure providers will operate deployments, accounts, storage, backups, domains, uptime, and updates. Kois will maintain the software, documentation, releases, and security fixes but will not initially provide managed hosted accounts or hosted image storage.

## Consequences

This reduces Kois-operated infrastructure and storage obligations and supports user control. It increases the importance of installation documentation, configuration validation, upgrade guidance, security communication, and recovery procedures. A future Kois-managed service requires a separate product, operational, privacy, and complexity decision.

## Alternatives considered

- Kois-operated SaaS: deferred because it introduces multi-tenancy, billing, storage, account support, and availability obligations.
- Photographer-specific custom deployments operated by Kois: rejected as the default because it would create support and maintenance commitments before the reusable workflow is validated.
