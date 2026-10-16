# Processing failure cleanup checkpoint — 2026-09-08

## GAL-012 hardening

Derivative processing now cleans both deterministic derivative targets whenever a job fails, is cancelled, or cannot commit its completed state. Cleanup uses `Promise.allSettled` so a cleanup failure is logged without hiding the original processing failure.

The administrator photo listing now exposes the persisted processing error. The Angular administration surface renders that message below a failed photo, so storage, decode, and derivative failures are not reduced to an unexplained status label.

## Verification

- Added a worker unit test that simulates storage exhaustion after the display derivative is written and verifies both derivative paths are cleaned and the job is marked failed.
- Extended the API browser-facing contract test to verify cancellation failure context is returned to the administrator.
- API unit tests: 13 passing.
- Angular unit tests: 2 passing.
- API lint/format and Angular lint/build pass.

## Remaining GAL-012 evidence

This hardening does not replace container/operator evidence. Representative camera files, storage-full behavior on the target deployment, architecture measurements, and the restore gate remain release work.
