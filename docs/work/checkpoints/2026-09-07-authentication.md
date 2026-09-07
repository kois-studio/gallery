# Checkpoint — 2026-09-07

- **Session mode:** focused
- **Repository and branch:** `kois-studio/gallery` / `main`
- **Session goal:** GAL-010 local administrator setup and sessions
- **Status:** completed; GAL-011 is next

## Completed

- Implemented an operator-armed, one-time setup endpoint using `SETUP_TOKEN`.
- Implemented password hashing with Node's built-in asynchronous scrypt API, random salts, versioned encoded parameters, and constant-time verification.
- Implemented opaque server-side administrator sessions with hashed tokens, expiry, revocation, HttpOnly/SameSite cookies, and a readable CSRF companion cookie.
- Implemented CSRF enforcement for cookie-authenticated mutations.
- Implemented sign-in throttling for one self-hosted installation.
- Added a maintenance-only interactive password reset command that revokes all sessions and cannot reopen setup.
- Removed the `argon2` native dependency after evaluating the self-hosting and installation trade-off.

## Verification

- `npm run build:api` — pass.
- `npm run test:api` — pass, 4 tests.
- `npm run test:api:e2e` — pass, 4 tests.
- `npm run lint` — pass.
- Authentication tests cover setup, setup re-entry, salted password hashing, invalid credentials, session authorization, CSRF rejection, and logout revocation.

## Known limits

- Full session-expiry, recovery-command exercise, and deployment-security checks remain release verification work.
- Visitor bearer-link authorization is GAL-014 and is not implemented yet.
- Docker image build remains unverified until a Docker daemon is available.

## Next safe action

Implement GAL-011: authenticated draft gallery creation and the local filesystem storage boundary.

## Follow-up release evidence

The later security verification pass added local e2e coverage for session expiry and the five-failure login throttle. Recovery-command execution and production deployment-security checks remain release work.
