# Gallery self-hosting

The first supported product deployment is one Docker container with two persistent directories:

- `deploy/data/` — SQLite and application state;
- `deploy/photos/` — original and derived photo objects.

From the repository root:

```sh
docker compose -f deploy/docker-compose.yml up --build -d
```

Gallery is then available at `http://localhost:3000`. The container binds to loopback by default so that a public installation cannot bypass its reverse proxy. Put a TLS-enabled reverse proxy in front of the container before exposing an installation to the internet. A minimal Caddy recipe is available at [`Caddyfile.example`](Caddyfile.example); replace its hostname and load it into Caddy on the host. The public marketing site at `gallery.kois.app` is a separate Vercel deployment and is not part of this container.

The host must point the public DNS record at the reverse-proxy machine and allow ports 80 and 443 through its firewall. If the public hostname is not `localhost`, set the allowed browser origin before starting the service:

```sh
export CORS_ORIGIN="https://gallery.example.com"
docker compose -f deploy/docker-compose.yml up --build -d
```

`GALLERY_PORT` can change the loopback port used by the container, for example `GALLERY_PORT=3100 docker compose -f deploy/docker-compose.yml up -d`; the reverse proxy must point to the same host port.

Production mode uses secure administrator and visitor cookies by default. Do not set `COOKIE_SECURE=false` for an internet-facing installation; that override exists only for the plain-HTTP local setup and demo commands.

The container serves the Gallery application and API only. The `/data/` and `/photos/` mount paths are not public routes and direct requests to them return `404`; do not expose those host directories through a separate web server or reverse-proxy rule. The application also emits baseline security response headers, but TLS termination, proxy hardening, and host firewall policy remain operator responsibilities.

To arm first-administrator setup, generate a secret and restart the service with it available to Compose:

```sh
export SETUP_TOKEN="$(openssl rand -base64 32)"
docker compose -f deploy/docker-compose.yml up --build -d
```

Use the setup flow with the `X-Setup-Token` header, then unset `SETUP_TOKEN` and restart the service. Setup is closed permanently after the first administrator exists. To recover the local administrator password, stop the running service and execute the maintenance command against the same volumes:

```sh
docker compose -f deploy/docker-compose.yml down
docker compose -f deploy/docker-compose.yml run --rm gallery npm run admin:reset
docker compose -f deploy/docker-compose.yml up -d
```

Do not commit files created under `deploy/data/` or `deploy/photos/`. Back up both directories together according to [`../docs/operations/backup-recovery.md`](../docs/operations/backup-recovery.md).

After restoring both stores into a clean installation, run the read-only integrity check before exposing the installation:

```sh
docker compose -f deploy/docker-compose.yml run --rm gallery npm run storage:verify
```

The command reports missing originals, missing ready-photo derivatives, and unreferenced files. A non-zero result requires operator review; it never deletes files or rewrites the database.

After reviewing the report, requeue missing derivatives and mark missing originals as failed with the explicit repair command:

```sh
docker compose -f deploy/docker-compose.yml run --rm gallery npm run storage:repair -- --confirm-repair
```

The repair command does not delete unreferenced files. Run the integrity check again after the service has processed requeued derivatives.
