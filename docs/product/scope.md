# Scope and roadmap

## First vertical slice

The first implementation slice should be one deployable application with:

- SQLite metadata;
- local filesystem storage;
- one deliberately small administrator model;
- gallery creation;
- multi-photo upload;
- optimized derivative generation;
- cover selection;
- public gallery browsing;
- individual photo downloads;
- Docker-based local/self-hosted startup;
- tests and documentation for the complete path.

## Next increments based on evidence

Potential next increments include:

- password-protected galleries;
- robust favorites or client selections;
- batch downloads;
- expiration;
- QR generation;
- photographer branding and themes;
- S3-compatible storage;
- resumable uploads;
- API access for headless consumers.

The order is not final. Lino’s workflow, technical beta testing, and failure evidence should determine priority.

## Explicit non-goals

Do not initially build:

- invoicing, accounting, or tax features;
- CRM or contact management;
- contracts or payment processing;
- print commerce;
- marketing automation;
- a Kois-operated hosted SaaS;
- framework-specific website plugins;
- an SDK without a real consumer;
- MCP tools before stable application operations exist;
- PostgreSQL support before an actual installation need exists.
