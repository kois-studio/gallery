# ADR 0013: Recoverable share links and editable published galleries

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** Parts of [ADR 0006](0006-local-auth-and-gallery-access.md): share-token storage and unpublish semantics
- **Superseded by:** None

## Context

A review of the first vertical slice against a photographer's normal delivery work found that the slice was secure but brittle:

- the share token was stored only as a hash and shown once, so a photographer who lost the link had to rotate it, breaking the link the client already had;
- unpublishing cleared the token, so any edit to a published gallery (typo, late photo, new cover) required unpublish → publish and silently replaced the client's link;
- a single failed or cancelled photo blocked publication permanently, and there was no way to delete or retry a photo or delete a gallery that contained photos;
- visitors were redirected to a token-less URL that stopped working when the 24-hour visitor session expired, and one browser could only hold access to one gallery at a time.

## Decision

- Gallery stores the share token in a readable `share_token` column next to `share_token_hash`. The administrator API returns the current share path for published galleries. Validation still uses the hash.
- Published galleries remain editable: details, cover, uploads, photo deletion, and photo retry work in both states. Visitors only ever see `ready` photos.
- Publication requires a processed cover photo. Failed, cancelled, or still-processing photos no longer block publication; they are simply not visible to visitors.
- Unpublishing revokes visitor sessions and stops new exchanges but keeps the token. Republishing restores the same link. **Rotation is the explicit way to invalidate a link.**
- Deleting a photo removes its metadata first, then its stored objects; a removed cover falls back to the first ready photo. Deleting a gallery removes its photos and objects in any state. Objects left by a failed removal are reported by `storage:verify`.
- The visitor stays on `/g/:slug/:token`; the web client exchanges the token on each load, so a bookmarked page keeps working until the link is rotated or the gallery is unpublished. Visitor cookies are scoped to `/api/shared/galleries/:slug`, so access to several galleries coexists in one browser.

## Consequences

- A copy of the SQLite database now contains working share links. The database already contains or references every private photograph, so its backups must already be protected as private data; the operator documentation states this explicitly.
- A photographer can correct and extend a delivered gallery without breaking the client's link, and can recover from processing failures from the UI.
- "Unpublish" means "take offline", not "revoke". The administrator UI labels rotation as the revocation action.
- Galleries published before migration 0006 have no readable token. Their existing link keeps working; the administrator rotates once to obtain a copyable link.

## Alternatives considered

- **Keep hash-only tokens and require rotation to re-copy:** rejected because it makes losing the link equivalent to revoking the client's access.
- **Encrypt the stored token with an installation secret:** deferred; it adds key management to a single-operator installation whose database is already sensitive, without changing who can read it.
- **Keep published galleries immutable and add a draft copy workflow:** rejected for the first beta as more complex than the observed need.
