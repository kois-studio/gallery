# ADR 0005: Narrow first-beta delivery contract

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None
- **Superseded by:** None

## Context

The product promise includes presentation, private delivery, downloads, and visitor selections, but the earlier first-slice document deferred private access and selections while still treating them as beta success criteria. That makes the first implementation boundary incoherent and invites accidental expansion into archives, expiration, branding, and client-management features.

Lino’s first real workflow is a validation source, not a permanent product definition. The first slice must prove the delivery problem with an event-sized but bounded workload and leave unresolved selection semantics visible.

## Decision

The first beta contract is:

- one self-hosted installation containing the first product deployment;
- one local administrator;
- draft gallery creation;
- server-mediated multi-file upload with visible per-file state;
- immutable original storage plus thumbnail and display derivatives;
- cover selection and publication readiness checks;
- private publication through a revocable, high-entropy share link;
- responsive visitor browsing; and
- individual original-file downloads.

Server-backed visitor selections are explicitly outside the first implementation slice and remain a beta gate. They become required only if Lino’s observed workflow demonstrates that the delivery-only contract cannot complete the real beta job. If required, they are a separate vertical slice with explicit persistence, visitor-session, submission, retrieval, and retention behavior. Browser-local favorites do not count as photographer-visible selections.

Batch archives, password-protected galleries, public indexing, expiration, QR generation, extensive branding, S3, resumable uploads, external APIs, SDKs, MCP, and multi-tenant accounts are outside this contract unless evidence creates a new requirement and a later decision accepts it.

## Consequences

The team can validate the highest-value path with a bounded implementation and test the risky boundaries early. The product will not yet satisfy photographers who require client selections or bulk archive downloads; that limitation must be communicated to beta users. The share link is a bearer credential, so revocation, token handling, logging, and private media delivery require deliberate security tests.

## Alternatives considered

- **Build selections and batch archives first:** rejected for the initial slice because both workflows have unresolved identity, persistence, resource, and recovery semantics.
- **Make the first slice public galleries only:** rejected because Lino’s event photographs and the product promise require a private-by-default delivery path.
- **Build a broad photographer-management platform:** rejected because it exceeds the photo-delivery boundary and would delay validation of the core workflow.

## Unresolved risks

- Lino may confirm that selections are essential, making the delivery-only slice insufficient for beta.
- A bearer link may not meet the desired privacy or client-access expectation.
- Real camera-file sizes and event volumes may require a different upload or processing design.

These risks are release-validation work, not permission to expand the first implementation slice silently.
