# Checkpoint — disposable local testing flows

## Decision

Delay VPS deployment while product UX and functionality are being refined.
Provide two repeatable local flows around isolated single-container Docker
profiles:

1. a clean first-run setup profile for the operator setup screen;
2. a seeded demo profile with synthetic galleries and images for product review.

## Implementation

- `npm run local:setup` starts a fresh profile on port 3500 and prints the
  setup URL and one-time setup token;
- `npm run local:demo` starts a fresh profile on port 3501, seeds a published
  gallery and draft gallery, verifies processing and private visitor delivery,
  removes the setup token, and prints the review URLs;
- `npm run test:local:flows` executes both profiles as disposable automated
  Docker smoke tests;
- the Playwright journey now submits the real `/setup` UI instead of calling
  the setup API directly.

The profiles use local SQLite and filesystem storage only. They do not use
external object storage or a VPS, and their state is ignored under `.local/`.

Validation passed on 2026-09-13 with `npm run test:local:flows`: both profiles
built from the Dockerfile, reached readiness, completed their checks, and were
stopped and cleaned up afterward. The existing default `deploy` installation
was left running and untouched.

The packaged Playwright journey also passed after switching its first-run step
from a direct setup API request to the real `/setup` screen, including the
administrator creation form, gallery publication, visitor browsing, and
original download.

The local profiles use an explicit `COOKIE_SECURE=false` exception because
their transport is plain loopback HTTP. Production defaults remain secure, so
an internet-facing installation still requires HTTPS through the documented
reverse proxy.
