# Hetzner deployment

- URL: **https://cheesepilgrim.joewaine.com/**
- Existing server: `fractal-1`, `178.105.125.95`, Hetzner Cloud, Falkenstein.
- Service: `cheese-pilgrim-web`, Compose project `cheese-pilgrim`.
- Deployment directory: `/opt/cheese-pilgrim`.
- Versioned image, release directory, pinned nginx base digest, and timestamps: [`deploy/hetzner.json`](../deploy/hetzner.json).

Verified 25 September 2026: valid public HTTPS, HTTP 308 redirect to HTTPS, healthy container running as UID 101, all **14 public browser checks passed** with exit code 0, and all **23 existing containers** retained their original IDs. Public checks covered map filtering, routes, bookmarks, captions, photo/video persistence, print pages with QR codes, backups, and mobile layouts. Browser-local test journals are not stored on the server.

This static application runs in its own unprivileged nginx container on port 8080, connected to the existing `coolify` Docker network. The existing Traefik proxy provides HTTPS, Let's Encrypt renewal, HTTP-to-HTTPS redirection, and compression. The container publishes no host ports. No existing proxy configuration, application environment, or database was changed.

DNS is a Cloudflare DNS-only A record pointing to the existing Hetzner server. No additional server or domain was purchased. The app has a read-only container filesystem, writable temporary storage, 128 MB memory limit, 0.5 CPU limit, automatic restart, bounded logs, and a `/healthz` probe.

## Deploy an update

```sh
npm test
npm run build
python3 scripts/deploy-hetzner.py inspect
python3 scripts/deploy-hetzner.py build
python3 scripts/deploy-hetzner.py dns
python3 scripts/deploy-hetzner.py deploy
python3 scripts/deploy-hetzner.py status
node tests/browser.mjs https://cheesepilgrim.joewaine.com
```

The script reads the existing DNS credential from `../render_migration/export/cloudflare-dns-token`; override the path with `FRACTAL_DNS_TOKEN_FILE`. Credentials are never printed, placed in images, or uploaded. The upload is an explicit archive of `dist/`, `Dockerfile`, and `deploy/nginx.conf`. Source code, Liam’s reference image, local journals, test outputs, and infrastructure credentials are excluded.

The `dns` step creates the exact subdomain if missing and refuses conflicting existing records. `inspect` records the running container IDs before deployment; `status` checks that unrelated containers still have their original IDs. Images use a resolved nginx digest recorded per release. `nginx -t` runs in a disposable container before activation. Compose recreates only this app's container, with a short interruption during updates.

## Inspect or roll back

On the Hetzner server:

```sh
docker compose --env-file /opt/cheese-pilgrim/image.env -f /opt/cheese-pilgrim/compose.yaml ps
docker logs --tail 50 cheese-pilgrim-web
```

The deploy script preserves a previous image selector and changed Compose configuration. To use the previous image with the current Compose configuration:

```sh
docker compose --env-file /opt/cheese-pilgrim/previous-image.env -f /opt/cheese-pilgrim/compose.yaml up -d --wait
```

For a configuration rollback, review `previous-compose.yaml` and use it with the corresponding image selector. Prior release directories and images are retained.

## Hosting does not change journal storage

Reviews, photographs, and uploaded videos are still stored only in each visitor’s browser. There is no server-side review database, login, or public submission endpoint. The server hosts the seed atlas, sample persona, and public assets. Existing notes on the localhost/Tailscale origins remain there. Public QR codes should be generated from the public HTTPS site.

## Technical references

- [Traefik Docker routing labels](https://doc.traefik.io/traefik/master/reference/routing-configuration/other-providers/docker/)
- [Official nginx unprivileged image](https://github.com/nginx/docker-nginx-unprivileged/blob/main/README.md)

The route labels match the existing server’s `http`/`https` entrypoints and `letsencrypt` certificate resolver. Video captions explicitly use `text/vtt`. Hashed build assets are immutable-cacheable; HTML and assets with stable filenames revalidate.
