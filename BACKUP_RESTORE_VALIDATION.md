# Backup & Restore Validation

**Purpose:** Document and validate backup/restore procedures for PostgreSQL and uploaded media.

---

## Backup components

| Asset | Script | Output location |
|-------|--------|-----------------|
| PostgreSQL | `scripts/backup/postgres-backup.mjs` | `infra/postgres/backups/postgres-*.sql.gz` |
| Uploads (clips, ebooks, announcements) | `scripts/backup/uploads-backup.mjs` | `infra/postgres/backups/uploads-*.tar.gz` |
| Redis | AOF persistence | `redis_prod_data` Docker volume |

---

## Backup schedule (recommended)

| Frequency | Asset | Retention |
|-----------|-------|-----------|
| Every 6 hours | PostgreSQL | 30 days |
| Daily | Uploads archive | 30 days |
| Continuous | Redis AOF | Volume snapshots |

Automate via cron on deploy host:

```cron
0 */6 * * * cd /opt/wop && node scripts/backup/postgres-backup.mjs >> /var/log/wop-backup.log 2>&1
0 2 * * * cd /opt/wop && node scripts/backup/uploads-backup.mjs >> /var/log/wop-backup.log 2>&1
```

For managed Postgres (RDS, Cloud SQL), use provider-native automated backups with PITR.

---

## Procedure — PostgreSQL backup

### Prerequisites

- Compose stack running OR `DATABASE_URL` set for direct `pg_dump`

### Execute

```bash
# Via running compose postgres service (Linux/macOS)
node scripts/backup/postgres-backup.mjs

# Direct managed DB
DATABASE_URL="postgresql://..." USE_COMPOSE=1 pg_dump "$DATABASE_URL" | gzip > backup.sql.gz
```

### Validate artifact

```bash
node scripts/backup/validate-restore.mjs --postgres=infra/postgres/backups/postgres-LATEST.sql.gz
```

---

## Procedure — Uploads backup

```bash
# Requires api container running with uploads volume
node scripts/backup/uploads-backup.mjs
node scripts/backup/validate-restore.mjs --uploads=infra/postgres/backups/uploads-LATEST.tar.gz
```

---

## Procedure — Restore PostgreSQL (staging drill)

**Run on staging only first.**

1. Stop API writers:
   ```bash
   docker compose -f docker-compose.prod.yml stop api websocket
   ```

2. Restore:
   ```bash
   node scripts/backup/restore-postgres.mjs --file=infra/postgres/backups/postgres-TIMESTAMP.sql.gz
   ```

3. Verify schema:
   ```bash
   cd services/api && npx prisma migrate status
   ```

4. Smoke test:
   ```bash
   docker compose -f docker-compose.prod.yml up -d api websocket
   curl http://127.0.0.1:8080/api/v1/health
   ```

5. Auth path: login via admin, verify user count matches expectations

---

## Procedure — Restore uploads

```bash
docker compose -f docker-compose.prod.yml stop api websocket
docker compose -f docker-compose.prod.yml run --rm api mkdir -p /app/uploads
gunzip -c infra/postgres/backups/uploads-TIMESTAMP.tar.gz | \
  docker compose -f docker-compose.prod.yml exec -T api tar -xzf - -C /app
docker compose -f docker-compose.prod.yml up -d api websocket
```

Verify: access a known clip thumbnail or ebook cover URL.

---

## Validation test plan

| Step | Action | Expected |
|------|--------|----------|
| BAK-01 | Run postgres backup | Non-empty `.sql.gz` in backups dir |
| BAK-02 | Run validate-restore on backup | PASS |
| BAK-03 | Restore to staging DB | psql completes without fatal errors |
| BAK-04 | migrate status after restore | Up to date OR pending known migrations |
| BAK-05 | API health after restore | 200 |
| BAK-06 | Login after restore | Success with restored user |
| BAK-07 | Uploads backup | Non-empty `.tar.gz` |
| BAK-08 | Restore uploads + media URL | Asset loads |

---

## RPO / RTO targets

From `docs/disaster-recovery.md`:

- **RPO:** 15 minutes (with 6-hour backup + managed PITR)
- **RTO:** 60 minutes for full platform restore

---

## Test log template

| Date | Environment | Postgres backup | Postgres restore | Uploads backup | Uploads restore | Tester | Result |
|------|-------------|-----------------|------------------|----------------|-----------------|--------|--------|
| | staging | | | | | | |

---

## Related documents

- `DEPLOYMENT_RUNBOOK.md`
- `ROLLBACK_RUNBOOK.md`
- `docs/disaster-recovery.md`
- `docs/runbooks/postgres-outage.md`
