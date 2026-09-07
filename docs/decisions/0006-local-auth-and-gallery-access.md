# ADR 0006: Local administrator and visitor gallery access

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None
- **Superseded by:** None

## Context

Gallery is self-hosted first and cannot rely on a Kois-operated identity service. The first installation has one photographer/operator and does not need multi-tenant identity, organizations, or visitor accounts. It still handles private photographs and privileged upload, publication, deletion, and download operations.

The authentication model must be small enough for a first beta while enforcing authorization at the application boundary. A visitor identity system would add product and recovery requirements that the current workflow does not establish.

## Decision

The first-beta model is:

- a locally managed administrator identity with a password stored as a slow password hash;
- an operator-armed, one-time first-run setup flow that closes after the administrator is created;
- server-side administrator sessions represented in the browser by secure, HttpOnly, SameSite cookies, with expiry and revocation;
- server-side authorization checks for every administrator mutation and every protected media read;
- no visitor account or external identity provider;
- a high-entropy, revocable bearer share token for each published private gallery; and
- a scoped visitor access session where practical so the bearer token does not appear in every subsequent page or media URL.

Password recovery is intentionally local and operator-controlled. Gallery will not require email delivery or a Kois identity service for recovery. The supported recovery path is a documented maintenance command run by an operator with local access to the installation, with the application stopped or placed in an explicit maintenance state. It sets a new administrator password, invalidates all existing administrator sessions, and is never exposed as an HTTP endpoint. The command must require explicit confirmation and must not recreate or reopen first-run setup.

The share token must not be used as a storage key, logged, or exposed through avoidable referrers. Unpublishing or rotating the token revokes access. Password-protected galleries, visitor identity, MFA, external OAuth, organizations, and multi-installation tenancy are deferred.

## Consequences

This keeps the self-hosted installation independent of Kois infrastructure and minimizes the first identity model. It places password reset and credential recovery responsibility on the operator and leaves visitor attribution unresolved. A leaked share link grants gallery access until revocation, so the UI and documentation must make that trade-off clear and provide rotation. CSRF, session expiry, direct-object access, cross-gallery access, brute-force, setup re-entry, and malformed-token behavior need repeatable tests.

## Alternatives considered

- **External identity provider:** deferred because it creates a hosted dependency, account lifecycle, and provider-outage contract without a demonstrated need for the first installation.
- **Visitor accounts or email verification:** deferred because the product has not established a visitor identity requirement and the first beta can validate delivery without it.
- **Only an unguessable public gallery slug:** rejected because a slug is not a sufficient bearer secret for private media.
- **Client-side-only access checks:** rejected because the browser is untrusted and cannot enforce authorization.

## Unresolved risks

- The bearer-link model may be inadequate for Lino’s privacy expectations.
- The local recovery command must be documented and tested before beta.
- A later multi-administrator or multi-photographer model will require new ownership and membership decisions.
