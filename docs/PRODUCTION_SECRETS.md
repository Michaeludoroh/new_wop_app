# Production Secrets Reference

**Classification:** Internal — store values in GitHub Environment Secrets, Vault, or host secret manager. Never commit real values.

---

## Required for API startup (production/staging)

| Secret | Min length | Purpose | Startup failure message |
|--------|------------|---------|-------------------------|
| `DATABASE_URL` | — | PostgreSQL connection | `required environment variable "DATABASE_URL" is missing` |
| `REDIS_URL` | — | Cache, throttling, realtime adapter | `required environment variable "REDIS_URL" is missing` |
| `JWT_ACCESS_SECRET` | 32 | Access token signing | `JWT_ACCESS_SECRET must be at least 32 characters` |
| `JWT_REFRESH_SECRET` | 32 | Refresh token signing | Must differ from access secret |
| `JWT_ACCESS_EXPIRES_IN` | — | e.g. `15m` | Duration validation error |
| `JWT_REFRESH_EXPIRES_IN` | — | e.g. `7d` | Must exceed access expiry |
| `CORS_ORIGIN` | — | Admin origin allowlist | Missing in production validation |
| `CONTENT_ACCESS_SECRET` | 32 | eBook stream token signing | Placeholder rejected at startup |
| `METRICS_AUTH_TOKEN` | 16 | Protects `/metrics` | Required in production |

## Required for admin-web build

| Secret | Purpose |
|--------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Baked into client bundle at build time |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Realtime client URL (build time) |

## Required for mobile release

| Secret | Purpose |
|--------|---------|
| `API_BASE_URL` | `--dart-define` at Flutter build time |

## Integration secrets (degraded mode if unset)

| Secret | When required | Degraded behavior |
|--------|---------------|-------------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` or `FCM_*` | Push notifications | FCM disabled; API starts |
| `SMTP_HOST` + auth | Email delivery | MOCK_SMTP (logs only) |
| `FLUTTERWAVE_SECRET_KEY` | Payments | Checkout returns not configured |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook verification | Webhooks rejected |

## GitHub Actions secrets (production environment)

Configure in **Settings → Environments → production**:

| Secret | Required |
|--------|----------|
| `PRODUCTION_DATABASE_URL` | Yes |
| `PRODUCTION_REDIS_URL` | Yes |
| `PRODUCTION_JWT_ACCESS_SECRET` | Yes |
| `PRODUCTION_JWT_REFRESH_SECRET` | Yes |
| `PRODUCTION_CONTENT_ACCESS_SECRET` | Yes |
| `PRODUCTION_METRICS_AUTH_TOKEN` | Yes |
| `PRODUCTION_CORS_ORIGIN` | Yes |
| `PRODUCTION_API_PUBLIC_URL` | Yes |
| `PRODUCTION_POSTGRES_PASSWORD` | Yes (compose deploys) |

## Validation commands

```bash
# Template contract
node scripts/env/validate-env.mjs --check-templates

# Production secret completeness
node scripts/env/validate-production-secrets.mjs --mode=production

# API contract (with env vars exported)
node scripts/env/validate-env.mjs --target=api
```

## Placeholder rejection

Values starting with `replace_with_` are rejected at API startup in production via `validateSecurityConfig()`.

Deploy pipeline additionally runs `scripts/env/validate-production-secrets.mjs` before any deployment step.
