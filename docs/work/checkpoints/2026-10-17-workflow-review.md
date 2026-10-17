# Checkpoint — 2026-10-17 workflow review and fixes

- **Session mode:** project-implementation / advance
- **Repository and branch:** kois-studio/gallery / main
- **Commit:** this checkpoint's commit on top of `54d4062`; not pushed
- **Session goal:** Review the paused MVP as a photographer would use it, then fix the blockers it exposed.
- **Status:** ready to continue; the next step needs David and the beta photographer (GAL-018)

## Review findings

The backend design (SQLite, durable in-process jobs, local storage boundary, hashed sessions, CSRF, scrypt) was sound. The workflow was not:

- a failed or cancelled photo blocked publication permanently, with no photo delete, retry, or deletion of a gallery containing photos;
- published galleries were immutable, and unpublish → publish replaced the client's link;
- the share link was shown once and could not be recovered;
- visitors were redirected to a URL that stopped working after 24 hours, one browser could only open one gallery, and a bad link led to the admin login page;
- the whole batch was one multipart request, so one network failure lost everything;
- cookie `Max-Age` was in milliseconds; sign-in throttling keyed on the proxy address; a malformed cookie caused a 500;
- multipart filenames were stored as latin1 mojibake (`Año.jpg` became `AÃ±o.jpg`);
- portrait camera files stored pre-rotation dimensions, thumbnails were square crops, and the visitor page had no lightbox navigation;
- CI on `main` had been red since the last push because the runtime Docker stage compiled `better-sqlite3` without a toolchain.

## Completed

- Committed the month of pending work in seven logical commits, including the Docker fix.
- ADR 0013 and migration 0006: recoverable share links, editable published galleries, publication gated only on a processed cover, photo retry/delete, gallery deletion with object cleanup.
- Per-gallery path-scoped visitor cookies, `Max-Age` in seconds, tolerant cookie parsing, `sendFile` delivery with Range/ETag, RFC 6266 UTF-8 filenames, UTF-8 multipart filename recovery, a Content-Security-Policy, and `TRUST_PROXY` (enabled in Compose behind the loopback binding).
- Single-decode derivative generation, aspect-preserving 800px thumbnails, display-oriented dimensions, EXIF `DateTimeOriginal` capture time, ordering by capture time then filename.
- Rebuilt visitor page (share URL is the bookmark, cover hero, justified rows, full lightbox with keyboard, swipe, and focus management, unavailable-link page) and admin workflow (per-file parallel uploads with retry and drag and drop, persistent copyable link, details editor, take offline, delete, retry).

## Verification

- `bun run test` in `apps/api` — pass (18 tests).
- `bun run test:e2e` in `apps/api` — pass (17 tests, including the new `lifecycle` suite).
- `bun run lint`, `bun run format:check` in `apps/api` — pass.
- `bun run lint:check`, `bun run test` in `apps/web` — pass (2 tests).
- `npm run build` then `npm run e2e --prefix apps/web` — pass (packaged browser journey, no CSP violations).
- `docker build -f deploy/Dockerfile .` — pass on Docker Desktop arm64.
- `npm run test:local:flows` — pass (clean setup and seeded demo containers).
- Manual visual review of admin, visitor hero, grid, and lightbox at 1440×900 and 390×844 with synthetic images — done.
- Not run: CI on GitHub (nothing pushed), real devices, screen readers, Lighthouse, real camera files.

## Decisions and risks

- The SQLite database now contains working share links; backup guidance says so (ADR 0013).
- Photos processed before migration 0006 keep square thumbnails and no capture time until regenerated (GAL-019); no real installation is affected.
- The license (GAL-005) and the npm-versus-Bun toolchain question remain David's decisions.

## Work queue changes

- GAL-012, GAL-015: next actions updated.
- GAL-018 created (Ready, P0): deliver one real event with the beta photographer.
- GAL-019 created (Proposed, P2): derivative regeneration command.
- Toolchain and medium-derivative questions added to `docs/questions.md`.

## Next safe action

Push after David approves it and confirm CI is green. Then pick a real event with the beta photographer and run GAL-018.
