# Scope and roadmap

## First vertical slice

The recommended first implementation slice is one self-hosted installation containing the Angular frontend and NestJS backend that proves the complete delivery path:

- first-run administrator setup and sign-in;
- SQLite metadata;
- local filesystem storage;
- one deliberately small administrator model;
- gallery creation;
- server-mediated multi-photo upload with observable per-file state;
- optimized derivative generation;
- cover selection;
- private-by-default publication through a revocable unguessable share link;
- responsive visitor gallery browsing;
- individual photo downloads;
- Docker-based local/self-hosted startup;
- health/readiness, backup, and restore documentation;
- tests and documentation for the complete path.

This slice is valuable because it replaces a generic file-transfer link with a photographer-controlled, presentable gallery while exercising the risky boundaries: authentication, authorization, large-file upload, image processing, private media delivery, and recovery. It deliberately does not attempt to be a complete client-selection product.

## First beta gate

The first private beta is not ready until the vertical slice has passed a representative synthetic workload and the beta photographer has confirmed the visitor job to be validated. The default beta gate is:

- upload and process an event-sized batch without silent loss;
- publish and revoke a private share link;
- browse on a representative mobile device and desktop browser;
- download individual originals predictably;
- restore the database and storage together in a clean installation; and
- record whether visitor selections are required for the actual beta.

If selections are required, the beta must add a server-backed anonymous selection workflow with explicit submission and photographer retrieval before it can claim selection value. Browser-local favorites alone do not satisfy that requirement. The selection identity, persistence, and export behavior remain an evidence gate rather than an invented feature.

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

The order is intentionally evidence-driven. Batch downloads are not a default promise for hundreds of files: the first slice supports individual originals, and a batch archive is a separate asynchronous workflow only if real usage requires it.

## Explicit non-goals for the first slice

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
