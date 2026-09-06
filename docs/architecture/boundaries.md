# System and responsibility boundaries

## Kois versus photographer/operator

Kois maintains the open-source software, documentation, releases, and security fixes. The photographer or hosting operator is responsible for deploying Gallery, selecting infrastructure, configuring domains and storage, managing credentials, backing up data, applying updates, and deciding how their installation handles personal data.

Kois must not promise uptime, hosted-data availability, backups, or operational response for self-hosted installations unless a future managed service explicitly assumes those responsibilities.

## Application trust boundaries

The design must distinguish:

- administrator requests;
- visitor requests;
- password or session credentials;
- public gallery metadata;
- private gallery metadata;
- original media;
- derived media;
- local filesystem or object storage;
- database metadata;
- operator configuration and secrets.

Every boundary needs an owner, validation behavior, authorization rule, and failure behavior before it is treated as implemented.

## Public and private context

This repository may contain public technical rationale, proposed architecture, product boundaries, and OSS roadmap information. It must not contain private Kois strategy, relationship details, private photography permissions, real client records, credentials, or sensitive legal/benefits notes.

The private [`kois-context`](https://github.com/kois-studio/kois-context) repository may contain the Kois-level reason for choosing Gallery, portfolio and brand implications, private collaboration context, permission tracking, and other information unsuitable for a public repository.
