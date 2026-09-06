# Self-hosting and operator experience

## Initial deployment goal

The first supported path should be reproducible from a clean checkout or release using Docker Compose or an equivalently simple deployment. The goal is not to support every infrastructure provider immediately; it is to make one local/self-hosted path reliable and understandable.

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

## Configuration categories

Configuration should distinguish:

- application mode and public URL;
- database path;
- local storage path;
- object-storage endpoint, bucket, region, and credentials when supported;
- cookie/session settings;
- processing limits;
- logging and diagnostics.

Secrets must be supplied through operator-controlled environment or secret configuration. They must not be committed, embedded in browser bundles, or written to logs.

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
