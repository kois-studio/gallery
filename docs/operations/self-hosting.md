# Self-hosting and operator experience

## Initial deployment goal

The first supported path should be reproducible from a clean checkout or release using Docker Compose or an equivalently simple deployment. The goal is not to support every infrastructure provider immediately; it is to make one local/self-hosted path reliable and understandable.

Vercel is relevant to the separate `landing/` marketing/documentation site, not to the persistent Gallery product installation. The first product deployment must retain durable access to SQLite and the configured photo-storage root, so serverless-only hosting is outside the first self-hosting contract.

The supported first shape is one application container with two persistent mounts: one for SQLite/configuration state and one for the photo-storage root. Compose binds the application to loopback by default, and a reverse proxy or equivalent TLS termination is expected for internet exposure; [`deploy/Caddyfile.example`](../../deploy/Caddyfile.example) provides the minimal Caddy shape. Multiple application instances, shared network filesystems, managed databases, and container-orchestrator deployment are outside the first support contract.

The minimal installation should define:

- application image or runtime;
- mounted database directory;
- mounted photo-storage directory;
- public URL;
- first administrator setup;
- configuration validation;
- health/readiness behavior;
- backup and restore instructions;
- upgrade and migration instructions.

The first deployment must expose a documented health/readiness check that verifies configuration and the ability to use the database and storage root without revealing secrets or private media. Readiness must be false while required migrations or storage checks cannot complete.

## Configuration categories

Configuration should distinguish:

- application mode and public URL;
- database path;
- local storage path;
- object-storage endpoint, bucket, region, and credentials when supported;
- cookie/session settings;
- cookie transport policy (`COOKIE_SECURE` defaults to secure cookies in production);
- processing limits;
- logging and diagnostics.

The setup secret and session configuration are operator secrets. Public URL and storage paths are configuration, not browser-exposed secrets. Defaults must fail closed when they would expose a private storage root or permit an unarmed first-admin flow.

Secrets must be supplied through operator-controlled environment or secret configuration. They must not be committed, embedded in browser bundles, or written to logs.

The first administrator setup is armed by supplying `SETUP_TOKEN` with at least 32 characters to the product container. The operator sends it in the `X-Setup-Token` header for the one-time setup request, then removes or rotates the deployment secret after setup. Setup is permanently closed once the first administrator exists.

## Operator responsibility

The operator owns:

- host and network security;
- DNS and TLS;
- storage account and credentials;
- backups and restore testing;
- upgrades and migrations;
- access to private photographs;
- retention and deletion decisions;
- monitoring and incident response for their installation.

Gallery documentation should make this boundary clear without pretending that self-hosting eliminates security or privacy work.

The supported operator contract is intentionally modest: install one documented deployment shape, protect it with TLS and a reverse proxy, keep the two persistent stores backed up, apply upgrades after a backup, and run the recovery drill. Gallery does not promise hosted availability, automated off-site backups, incident response, or data recovery by Kois.

The application does not publish its `/data/` or `/photos/` mount paths as web routes; direct requests are rejected. Operators must still ensure that a separate reverse proxy, static server, backup endpoint, or file-sharing service does not expose those host directories. Gallery emits baseline security headers, while TLS, proxy policy, network exposure, and host security remain operator responsibilities.

## Upgrade principles

An upgrade must document:

- application version;
- database migration requirements;
- storage compatibility;
- rollback or recovery expectations;
- backup requirement before upgrade;
- changes to configuration;
- user-visible behavior changes.

The project should not promise in-place rollback for migrations that make data irreversible. Recovery may require restoring a backup or applying a forward repair migration.
