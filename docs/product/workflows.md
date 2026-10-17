# Core workflows

These workflows are proposed and will be refined through the beta photographer’s real usage.

## Photographer: create and publish

1. Complete first-run setup using an operator-armed setup flow, then sign in to the local Gallery installation.
2. Create a gallery with a title, slug, description, and optional event date.
3. Upload a batch of photographs.
4. See per-file and batch-level progress, failures, and processing state.
5. Wait until all required derivatives exist for safe publication.
6. Choose a cover photograph.
7. Configure the draft for private link sharing.
8. Preview the visitor experience.
9. Publish the gallery through a private share link.
10. Copy the share URL at any time from the gallery page.
11. Keep editing after publication: fix details, change the cover, add late photographs, retry or delete failed ones. Visitors only see processed photographs.
12. Take the gallery offline (the link stops working until it is published again) or replace the link (the old link stops working for good).

Password access, public indexing, expiration, QR generation, and extensive branding are not part of the recommended first slice. A later gallery access mode must not weaken the server-side authorization rules.

## Visitor: browse and download

1. Open the shared URL.
2. Open the private share link; the server establishes scoped gallery access without requiring a visitor account in the first slice.
3. Browse a responsive grid using optimized derivatives.
4. Open a larger view without downloading originals by default.
5. Download an individual original photograph.
6. Return later by opening the same link or bookmark; it keeps working until the photographer replaces it or takes the gallery offline.

Batch archives are deferred. If introduced, they must be generated asynchronously, have bounded lifetime and size, and be authorized against the same gallery access context.

## Visitor: select photographs

This workflow is intentionally outside the recommended first delivery slice and unresolved at the identity level.

1. The visitor starts a selection session.
2. They mark or unmark photographs.
3. The selection survives the intended refresh/device behavior.
4. The visitor submits or shares the selection when appropriate.
5. The photographer can inspect and export the selection.

Before implementation, decide whether selection is session-token based, name/email based, or account based. The product must not promise photographer-visible selections without a persistence, identity, retention, and export model. Browser-local state can be a presentation convenience but is not a photographer-visible selection record.

## Operator: install and recover

1. Start Gallery with the documented minimal deployment.
2. Configure the database, local storage path, public URL, and first administrator.
3. Verify health and storage access.
4. Create a test gallery and complete a smoke workflow.
5. Back up the database and photo storage according to the documented procedure.
6. Upgrade using the supported migration path.
7. Restore or reconstruct the installation after a simulated failure and verify a representative private gallery.
