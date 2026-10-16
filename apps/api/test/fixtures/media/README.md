# Synthetic media fixtures

These fixtures are generated at test time with Sharp rather than committed as
photo binaries. That keeps the repository deterministic and avoids storing
real, private, or copyrighted photography in a public repository.

The format matrix intentionally covers:

- JPEG;
- PNG with transparency;
- WebP;
- JPEG with EXIF orientation metadata;
- malformed image content;
- empty files;
- unsupported image signatures.

Small format fixtures should be used for parser and upload-contract tests.
Larger event-like workloads should be generated in the test itself so that
tests can control dimensions, file counts, and memory pressure without making
the repository unnecessarily large.
