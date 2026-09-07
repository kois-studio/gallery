# System and responsibility boundaries

## Design status

The boundaries below are proposed design for the first beta. They describe responsibilities to preserve during implementation; they do not claim that any control exists yet.

## Kois versus photographer/operator

Kois maintains the intended open-source software, documentation, releases, and security fixes. The photographer or hosting operator is responsible for deploying Gallery, selecting infrastructure, configuring domains and storage, managing credentials, backing up data, applying updates, and deciding how their installation handles personal data.

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

## Proposed first-beta access model

Gallery is a single installation, not a multi-tenant service, for the first beta.

- **Administrator:** one locally managed administrator identity is the minimum model. The first-run setup must be explicitly armed by an operator-controlled one-time setup secret, must establish a password through a server-side form, and must be closed after use. The password is stored only as a slow password hash using the accepted scrypt implementation in ADR 0006.
- **Administrator session:** sign-in creates a random server-side session identifier. The browser receives only an `HttpOnly`, `Secure`-when-TLS, `SameSite` cookie; the persisted session record stores a hash or equivalent non-reversible representation of the identifier, with expiry and revocation. State-changing administration requests require CSRF protection appropriate to the chosen framework.
- **Visitor:** visitors do not create accounts for the first delivery slice. A published gallery is shared through a high-entropy, revocable bearer token. The server exchanges the share URL for a scoped visitor access session where practical, and all gallery and media reads still perform a server-side access check. The token must not be logged, placed in storage paths, or leaked through avoidable referrers. Rotation or unpublishing revokes access.
- **Authorization:** every administrator mutation checks the administrator session; every visitor page, derivative, and original download checks publication state and the visitor’s gallery scope. Client-side hiding, an unguessable filename, or a hidden route is not authorization.
- **Not in the first slice:** external identity providers, OAuth, MFA, visitor accounts, password-protected galleries, organizations, roles, and cross-installation tenancy. These require evidence and a new decision.

The full decision, including the trade-off of bearer-link visitor access, is in [ADR 0006](../decisions/0006-local-auth-and-gallery-access.md).

### First-beta authorization matrix

| Operation | Unauthenticated | Visitor with valid gallery access | Administrator | Wrong gallery or expired access |
| --- | --- | --- | --- | --- |
| Sign in / first setup | Setup only when explicitly armed | Denied | Allowed as applicable | Denied |
| Create or edit gallery | Denied | Denied | Allowed | Denied |
| Upload, delete, or process media | Denied | Denied | Allowed within owned installation | Denied |
| View published gallery | Denied | Allowed | Allowed for preview/operations | Denied |
| Read derivative | Denied | Allowed within gallery | Allowed | Denied |
| Download original | Denied | Allowed within gallery | Allowed | Denied |
| Publish, unpublish, or rotate link | Denied | Denied | Allowed | Denied |

This matrix is a proposed negative-test target, not test evidence.

## Public and private context

This repository may contain public technical rationale, proposed architecture, product boundaries, and OSS roadmap information. It must not contain private Kois strategy, relationship details, private photography permissions, real client records, credentials, or sensitive legal/benefits notes.

The private [`kois-context`](https://github.com/kois-studio/kois-context) repository may contain the Kois-level reason for choosing Gallery, portfolio and brand implications, private collaboration context, permission tracking, and other information unsuitable for a public repository.
