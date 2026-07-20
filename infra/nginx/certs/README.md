# TLS certificates for production nginx

## Production hostnames (Let's Encrypt)

| Hostname | Purpose | Cert path |
|----------|---------|-----------|
| `woppandmopp.com` | Flask website, Nest API (`/api/v1`), WebSocket (`/realtime`) | `/etc/letsencrypt/live/woppandmopp.com/` |
| `admin.woppandmopp.com` | Next.js app admin | `/etc/letsencrypt/live/admin.woppandmopp.com/` |

API and WebSocket are served on the apex domain via path routing (`woppandmopp.server.conf`), not separate subdomains.

Legacy subdomains `api.woppandmopp.com` and `ws.woppandmopp.com` redirect to the apex paths.

## Self-signed certs (local/staging only)

From the repository root:

```bash
mkdir -p infra/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/certs/privkey.pem \
  -out infra/nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

**Do not commit real private keys.** This directory is gitignored except this README.
