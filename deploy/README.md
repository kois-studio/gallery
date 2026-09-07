# Gallery self-hosting

The first supported product deployment is one Docker container with two persistent directories:

- `deploy/data/` — SQLite and application state;
- `deploy/photos/` — original and derived photo objects.

From the repository root:

```sh
docker compose -f deploy/docker-compose.yml up --build -d
```

Gallery is then available at `http://localhost:3000`. Put a TLS-enabled reverse proxy in front of the container before exposing an installation to the internet. The public marketing site at `gallery.kois.app` is a separate Vercel deployment and is not part of this container.

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
