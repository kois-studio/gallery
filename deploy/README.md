# Gallery self-hosting

The first supported product deployment is one Docker container with two persistent directories:

- `deploy/data/` — SQLite and application state;
- `deploy/photos/` — original and derived photo objects.

From the repository root:

```sh
docker compose -f deploy/docker-compose.yml up --build -d
```

Gallery is then available at `http://localhost:3000`. Put a TLS-enabled reverse proxy in front of the container before exposing an installation to the internet. The public marketing site at `gallery.kois.app` is a separate Vercel deployment and is not part of this container.

Do not commit files created under `deploy/data/` or `deploy/photos/`. Back up both directories together according to [`../docs/operations/backup-recovery.md`](../docs/operations/backup-recovery.md).
