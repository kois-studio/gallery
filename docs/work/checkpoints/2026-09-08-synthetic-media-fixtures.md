# Checkpoint — synthetic media fixture policy

## Decision

Gallery API tests use deterministic synthetic media generated at test time.
The repository does not commit real or generated photography binaries as test
fixtures.

## Rationale

Gallery is public and must not contain private client photographs or assets
whose copyright and redistribution permissions are unclear. Runtime-generated
fixtures also keep the repository small while allowing tests to control image
dimensions, file counts, and workload pressure independently.

## Coverage

The upload e2e suite now exercises JPEG, transparent PNG, WebP, JPEG EXIF
orientation metadata, malformed image content, empty files, and an unsupported
GIF signature. The existing synthetic twenty-file workload remains separate so
format-contract tests stay small and the workload test remains representative
of batch processing behavior.

## Follow-up

If a real camera sample becomes necessary, add only an explicitly approved,
redistributable sample under a documented license and keep it separate from
private or Lino-specific content.
