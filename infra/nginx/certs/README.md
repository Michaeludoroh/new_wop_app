# TLS certificates for production nginx

Place certificate files here before enabling HTTPS server blocks in `conf.d/*.server.conf`:

| File | Description |
|------|-------------|
| `fullchain.pem` | Full certificate chain (Let's Encrypt or CA) |
| `privkey.pem` | Private key |

## Generate self-signed certs (local/staging only)

From the repository root:

```bash
mkdir -p infra/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/certs/privkey.pem \
  -out infra/nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```

Then uncomment the HTTPS `server` blocks in `infra/nginx/conf.d/api.server.conf` (and add matching blocks for admin/ws).

## Production (Let's Encrypt)

Use certbot on the host or a sidecar container. Mount the resulting files into this directory.

**Do not commit real private keys.** This directory is gitignored except this README.
