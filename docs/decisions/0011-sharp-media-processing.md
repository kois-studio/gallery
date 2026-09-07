# ADR 0011: Sharp media processing contract

- **Status:** Accepted for the first beta
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Gallery must create browser-friendly derivatives while preserving the photographer’s original bytes. The first implementation needs a bounded, understandable media contract rather than an attempt to catalog every camera format.

## Decision

Gallery uses Sharp for server-side image inspection and derivative generation.

The first beta accepts JPEG, PNG, and WebP source images. RAW, HEIC/HEIF, GIF animation, SVG, video, and unsupported or malformed formats are rejected with an explicit per-file error. Originals are retained byte-for-byte after validation. Required derivatives are WebP thumbnail and WebP display variants; exact pixel dimensions and quality are implementation constants documented with the generated behavior.

Initial configurable safety limits are:

- 100 MiB per original file;
- 500 files and 10 GiB per upload batch;
- 100 megapixels maximum decoded image area; and
- two concurrent processing jobs per application instance.

These are beta safety limits, not performance guarantees. The representative synthetic workload must measure them on x64 and arm64 Docker environments and may produce a later limits ADR.

Sharp applies EXIF orientation during derivative generation and strips metadata from derivatives by default. Originals are never rewritten by processing. Derivative output is written to temporary storage and finalized only after successful validation.

## Consequences

The first release is predictable and avoids RAW/HEIC native-format complexity. Some photographers will need conversion before upload; that limitation must be visible. Sharp’s native/prebuilt dependency behavior must be tested in the supported Docker image and lockfiles.

## Alternatives considered

- **ImageMagick/libvips directly:** deferred because Sharp already provides the required Node integration and bounded image operations.
- **Accept every format supported by the underlying library:** rejected because support must be an intentional product contract, not an accidental dependency capability.
- **Process originals in the browser:** rejected because it cannot provide a reliable shared derivative/recovery contract for self-hosted installations.
