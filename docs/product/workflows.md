# Core workflows

These workflows are proposed and will be refined through Lino’s real usage.

## Photographer: create and publish

1. Sign in to the local Gallery installation.
2. Create a gallery with a title, slug, description, and optional event date.
3. Upload a batch of photographs.
4. See per-file and batch-level progress, failures, and processing state.
5. Wait until enough derivatives exist for safe publication.
6. Choose a cover photograph.
7. Configure visibility and optional password/expiration.
8. Preview the visitor experience.
9. Publish the gallery.
10. Copy a share URL and, later, generate a QR code.

## Visitor: browse and download

1. Open the shared URL.
2. Enter a password when required.
3. Browse a responsive grid using optimized derivatives.
4. Open a larger view without downloading originals by default.
5. Download an individual photograph or approved batch.
6. Return later using the intended access mechanism without exposing private media through guessable URLs.

## Visitor: select photographs

This workflow is intentionally unresolved at the identity level.

1. The visitor starts a selection session.
2. They mark or unmark photographs.
3. The selection survives the intended refresh/device behavior.
4. The visitor submits or shares the selection when appropriate.
5. The photographer can inspect and export the selection.

Before implementation, decide whether selection is browser-local, session-token based, name/email based, or account based. The product must not promise photographer-visible selections without a persistence and identity model.

## Operator: install and recover

1. Start Gallery with the documented minimal deployment.
2. Configure the database, local storage path, public URL, and first administrator.
3. Verify health and storage access.
4. Create a test gallery and complete a smoke workflow.
5. Back up the database and photo storage according to the documented procedure.
6. Upgrade using the supported migration path.
7. Restore or reconstruct the installation after a simulated failure.
