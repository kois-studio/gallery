# Local testing flows

Gallery has two disposable local Docker flows. They use the same single
container, SQLite database, local filesystem storage, migrations, processing
worker, Angular frontend, and NestJS API as a self-hosted installation. They do
not use Vercel, S3, or a VPS.

The flow state is stored under `.local/`, which is ignored by Git. Running a
flow resets only its own profile before starting it.

## First-run setup flow

Start a clean installation:

```sh
npm run local:setup
```

Open the printed `/setup` URL and enter the printed setup token and an
administrator password. This exercises the same first-run path an operator
uses when the installation has no administrator yet. The current product only
needs one browser configuration step because storage and database locations
are deployment configuration, not first-run browser settings; the UI can grow
into more wizard steps when user-facing configuration is added.

The profile uses port `3500` and persists data under `.local/flows/setup/`.
The command prints the exact stop command.

The local profiles explicitly set `COOKIE_SECURE=false` because they run over
plain loopback HTTP. This is a local transport exception only; normal
production mode defaults to secure cookies and must be served through HTTPS.

## Seeded demo flow

Start a clean installation and load synthetic example data:

```sh
npm run local:demo
```

The command builds and starts a separate Docker installation on port `3501`,
creates the local administrator, creates a published gallery and a draft
gallery, uploads four synthetic JPEGs with different aspect ratios, processes
them, selects a cover, publishes a private share link, and verifies visitor
access. It then restarts the container with the setup token removed.

The command prints the admin URL, demo password, visitor URL, state directory,
and stop command. The images are intentionally synthetic and disposable; they
are not representative copyright or camera assets.

## Automated verification

Run both Docker flows as isolated smoke tests:

```sh
npm run test:local:flows
```

The setup verification checks readiness, first-admin setup, and setup re-entry
rejection. The demo verification checks readiness, seeding, derivative
completion, publication, private visitor-session exchange, and the four-photo
visitor response. Test profiles are stopped and their `.local/` state is
removed afterward.

These flows complement, rather than replace, the unit, API e2e, and Playwright
tests. The Playwright critical journey also starts from a clean installation
and now submits the actual `/setup` UI form.
