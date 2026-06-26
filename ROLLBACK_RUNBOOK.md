# WOP Platform — Rollback Runbook

**When to use:** Post-deploy failures, elevated error rates, or failed health checks after a release.

---

## Rollback scope

| Component | Automated | Procedure |
|-----------|-----------|-----------|
| API container | Yes | `scripts/deploy/rollback.mjs` |
| WebSocket container | Yes | Same script (shared image) |
| Admin dashboard | Yes | Same script |
| Nginx config | Manual | Redeploy previous config from git tag |
| Database schema | **Manual** | Forward-only migrations — see §Database rollback |
| Uploads volume | N/A | Persistent volume retained across rollbacks |

---

## Prerequisites

- Previous successful deploy recorded in `.deploy/release-state.json`
- Docker Compose access on deploy host
- Health check URLs configured

---

## Automated application rollback

### Step 1 — Identify releases

```bash
node scripts/deploy/release-state.mjs show
```

Note `releases[0]` (current) and `releases[1]` (previous).

### Step 2 — Execute rollback

```bash
export DEPLOY_ENV=production
export API_HEALTH_URL=https://api.your-domain.org/api/v1/health
export WS_HEALTH_URL=https://ws.your-domain.org/api/v1/health
export ADMIN_HEALTH_URL=https://admin.your-domain.org

node scripts/deploy/rollback.mjs
```

### Step 3 — Rollback to explicit tag (if state file missing)

```bash
export ROLLBACK_TAG=prod-abc1234
node scripts/deploy/rollback.mjs
```

### Step 4 — Verify

```bash
node scripts/deploy/verify-health.mjs
```

Manual smoke: admin login, mobile login, subscription status read.

---

## CI/CD rollback

The deploy workflow runs rollback automatically on failure when `run_compose_up: true`:

```yaml
- name: Rollback on failure
  if: failure() && inputs.run_compose_up
  run: node scripts/deploy/rollback.mjs
```

---

## Database rollback guidance

**Prisma migrations are forward-only.** There is no automated `migrate down` in production.

### Option A — Forward fix (preferred)

1. Roll back application containers (above)
2. Ship hotfix migration or config patch
3. Deploy forward

### Option B — Restore from backup (destructive)

Use only for schema corruption or failed migration.

1. **Stop writers:** scale API + WebSocket to 0
   ```bash
   docker compose -f docker-compose.prod.yml stop api websocket
   ```

2. **Restore Postgres** from latest good backup:
   ```bash
   node scripts/backup/restore-postgres.mjs --file=infra/postgres/backups/postgres-TIMESTAMP.sql.gz
   ```

3. **Verify migration state:**
   ```bash
   cd services/api && DATABASE_URL=... npx prisma migrate status
   ```

4. **Restart application:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d api websocket
   ```

### Option C — Point-in-time recovery (managed Postgres)

Use cloud provider PITR to timestamp before failed deploy. Re-run migrations if needed.

---

## Nginx / TLS rollback

```bash
git checkout <previous-tag> -- infra/nginx/
docker compose -f docker-compose.prod.yml exec reverse-proxy nginx -t
docker compose -f docker-compose.prod.yml restart reverse-proxy
```

---

## Admin-only rollback

If API is healthy but admin build is broken:

```bash
export ROLLBACK_TAG=<previous-admin-tag>
docker compose -f docker-compose.prod.yml up -d --no-build admin-web
```

Rebuild if needed:

```bash
docker build -t ministry-admin:$ROLLBACK_TAG ./apps/admin-web
```

---

## Post-rollback

1. Create incident record
2. Root-cause failed release
3. Fix forward on branch
4. Re-run full `DEPLOYMENT_RUNBOOK.md` on staging before retry

---

## Validation checklist

- [ ] `verify-health.mjs` passes all three endpoints
- [ ] Admin login works
- [ ] Mobile auth + refresh works
- [ ] No elevated 5xx in logs
- [ ] Database migration status consistent

---

## Related documents

- `DEPLOYMENT_RUNBOOK.md`
- `BACKUP_RESTORE_VALIDATION.md`
- `docs/disaster-recovery.md`
