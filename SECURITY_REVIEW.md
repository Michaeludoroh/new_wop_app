# WOPP — Security Review (Production Deployment)

**Date:** 2026-06-19  
**Scope:** Pre-production security posture for API, admin-web, mobile, infrastructure, and third-party integrations  
**Classification:** Blocker · High · Medium · Low

---

## Summary

| Severity | Count | Deployment impact |
|----------|-------|-------------------|
| Blocker | 2 | Must fix before production |
| High | 6 | Fix or explicit risk acceptance required |
| Medium | 8 | Address in first production sprint |
| Low | 5 | Track as hardening backlog |

**Overall:** Application-layer security controls are **substantially implemented**. Infrastructure and operational security gaps (nginx, backups, deploy automation, admin token storage) prevent a clean production sign-off.

---

## 1. Authentication & session management

### Controls in place

- JWT access + refresh with separate secrets (`validateSecurityConfig` enforces ≥32 chars, rejects weak placeholders)
- Refresh token stored server-side with expiry validation
- `JwtStrategy` validates user exists, not deleted, role matches DB
- Auth endpoints have strict rate limits (3–10 req/min)
- Disabled users blocked at login (P0 remediation)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| AUTH-01 | Admin tokens stored in `localStorage` + JS-readable mirror cookies (not `HttpOnly`) — XSS can steal session | **High** | Migrate refresh to HttpOnly cookie; minimize localStorage exposure |
| AUTH-02 | JWT refresh DB expiry may drift from `JWT_REFRESH_EXPIRES_IN` if both custom vars set inconsistently | Medium | Single canonical refresh TTL source |
| AUTH-03 | No email verification flow (P3-008) — account enumeration possible on register | Low | Add verification if policy requires |

---

## 2. Authorization (RBAC)

### Controls in place

- Hierarchical `RolesGuard` on privileged routes
- Admin middleware enforces route-level roles (`middleware.ts`)
- Documented role matrix: `services/api/docs/RBAC_ROLE_MATRIX.md`
- 403 on admin API no longer triggers full logout (P2-002)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| RBAC-01 | Route-security matrix not enforced in CI — new routes could miss guards | Medium | Add automated guard coverage test |
| RBAC-02 | Fine-grained permissions not implemented (P3-007) | Low | Future sprint |

---

## 3. Transport & network security

### Controls in place

- Helmet on API (CSP default in prod-like mode)
- CORS fail-closed when `CORS_ORIGIN` unset in production
- `trust proxy` enabled in prod-like mode
- TLS expected via reverse proxy (when configured)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| NET-01 | **Missing nginx/TLS configs** in repo — `docker-compose.prod.yml` cannot terminate HTTPS | **Blocker** | Add `infra/nginx/` or use managed LB |
| NET-02 | Redis/Postgres in compose have no auth/TLS — OK only on private network | Medium | Use managed DB with TLS; Redis AUTH in prod |
| NET-03 | Admin-web has no `next.config` security headers | Medium | Add `headers()` for HSTS, X-Content-Type-Options, etc. |
| NET-04 | WebSocket CORS/origin policy should match API allowlist | Medium | Verify `realtime.gateway.ts` origin config in prod |

---

## 4. Input validation & injection

### Controls in place

- Global `ValidationPipe` with whitelist + forbid unknown values
- Profile update uses validated DTO (P1-001)
- Prisma parameterized queries (ORM)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| INJ-01 | Static file serving on `/api/v1/uploads` — path traversal risk mitigated by Express static; eBook files explicitly blocked | Low | Move uploads to private bucket + signed URLs (future) |
| INJ-02 | Multipart upload endpoints — ensure file type/size limits enforced server-side | Medium | Audit upload services for MIME/size caps |

---

## 5. Secrets management

### Controls in place

- `.gitignore` excludes `.env`, service account files
- Pino redacts `Authorization` and `Cookie` headers
- Metrics endpoint token-gated in production
- Flutterwave webhook signature validation (unit tested)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| SEC-01 | Production secrets not in secret manager — templates contain placeholders only | **High** | Provision via Vault/SSM/GitHub Secrets |
| SEC-02 | `FIREBASE_SERVICE_ACCOUNT_FILE` path in dev `.env.example` references a real-looking filename — ensure not committed | Medium | Audit git history; rotate if ever committed |
| SEC-03 | `CONTENT_ACCESS_SECRET` missing from `.env.production.example` — risk of weak/missing eBook token secret | **High** | Add to template; enforce in validate-env |
| SEC-04 | No secret rotation runbook | Medium | Document JWT/FCM key rotation procedure |

---

## 6. CORS policy

| Environment | Behavior | Risk |
|-------------|----------|------|
| Production (no `CORS_ORIGIN`) | Deny all cross-origin | Safe fail-closed |
| Production (configured) | Exact allowlist, credentials enabled | **Low** if admin URL correct |
| Development | Permissive (`true`) | Acceptable for dev only |

**Finding CORS-01 (Medium):** Misconfigured `CORS_ORIGIN` breaks admin entirely — add deploy-time validation (already in `validate-env.mjs`).

---

## 7. Rate limiting & abuse prevention

### Controls in place

- Global: 100 req/60s default (`ThrottlerGuard`)
- Auth routes: 3–10 req/60s per endpoint
- Tests: `auth.rate-limit.spec.ts`

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| RL-01 | Env template uses wrong variable names (`THROTTLE_*` vs `RATE_LIMIT_*`) | Medium | Align templates with `app.module.ts` |
| RL-02 | No IP-based blocking beyond Nest throttler — consider WAF/CDN rate limits | Low | Cloudflare/nginx `limit_req` |
| RL-03 | Payment webhook endpoints need separate abuse controls | Medium | Verify webhook rate limit / IP allowlist at LB |

---

## 8. Firebase & FCM security

### Controls in place

- Server-side only: Firebase Admin SDK credentials never sent to clients
- Credential loader validates JSON structure; supports secret manager injection via env
- FCM tokens registered only for authenticated users
- Graceful degradation when unconfigured (no crash)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| FCM-01 | Push disabled without credentials — acceptable degradation | Low | — |
| FCM-02 | Service account needs minimal IAM (Firebase Admin SDK role only) | Medium | Principle of least privilege in Firebase Console |
| FCM-03 | Mobile `google-services.json` in repo — expected for mobile; ensure API keys restricted by package/bundle ID | Medium | Firebase App Check (future) |

---

## 9. SMTP security

### Controls in place

- TLS supported via `SMTP_SECURE`
- Credentials not logged; connection test via readiness service
- Falls back to MOCK_SMTP without credentials (no accidental send in dev)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| SMTP-01 | Production without SMTP → password reset emails silently mocked | **High** | Configure real SMTP before launch |
| SMTP-02 | SPF/DKIM not verifiable from codebase | Medium | DNS checklist in PRODUCTION_CHECKLIST |

---

## 10. Flutterwave / payment security

### Controls in place

- Webhook HMAC validation (`FLUTTERWAVE_WEBHOOK_SECRET`)
- Amount/currency verification on reconcile
- Idempotent payment reconciliation
- Provider reference stored for audit trail

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| PAY-01 | Live keys not configured — payments non-functional | **High** | Configure before accepting real payments |
| PAY-02 | Webhook endpoint must be HTTPS-only publicly | Medium | Enforce at LB |
| PAY-03 | `PAYMENT_REDIRECT_BASE_URL` must not point to admin origin | Medium | Validate in deploy checklist |

---

## 11. Logging, monitoring & incident response

### Controls in place

- Structured JSON logging (Pino) with correlation IDs
- Prometheus metrics (request duration, auth failures, payment failures)
- Optional Sentry for 5xx capture
- DR plan and runbooks exist

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| OBS-01 | `/metrics` returns 403 without token in prod — correct | Low | — |
| OBS-02 | No automated alerting wired in prod compose | Medium | Deploy Prometheus/Alertmanager or use managed APM |
| OBS-03 | PII in logs minimized; verify no payment card data logged | Low | Periodic log audit |

---

## 12. Data protection & backup

### Controls in place

- Password hashes not returned from API
- Soft-delete pattern on users
- Postgres volume persistence in compose
- DR documentation with RTO/RPO targets

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| BAK-01 | **No automated backup implementation** — DR plan references backups but no jobs exist | **High** | Managed DB backups or cron `pg_dump` |
| BAK-02 | Upload media not in DB backups | **High** | S3/object storage with versioning |
| BAK-03 | Restore drill not evidenced | Medium | Execute before production cutover |

---

## 13. CI/CD security

### Controls in place

- Deploy workflow validates env, runs lint/test/build before deploy
- Prisma migration validation in pipeline
- Concurrency groups prevent parallel production deploys
- Secrets passed via GitHub encrypted secrets (not in workflow file)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| CI-01 | **Deploy and rollback steps are placeholders** | **Blocker** | Integrate real provider before automated prod deploy |
| CI-02 | Health URLs still use `example.com` | Medium | Parameterize per environment |
| CI-03 | Docker images not scanned for vulnerabilities in CI | Medium | Add Trivy/Snyk scan step |

---

## 14. Mobile client security

### Controls in place

- Tokens in `flutter_secure_storage`
- Global 401 refresh via `AuthenticatedDio` (P2-005)
- Certificate pinning not implemented (standard for v1)

### Findings

| ID | Finding | Severity | Remediation |
|----|---------|----------|-------------|
| MOB-01 | API URL baked at build time — correct for prod; wrong URL requires rebuild | Low | — |
| MOB-02 | No certificate pinning | Low | Consider for high-threat environments |
| MOB-03 | Firebase client config in repo — standard practice; restrict API keys in Google Cloud Console | Medium | Key restrictions by app signature |

---

## Risk acceptance matrix

| Finding | Can deploy without fix? | Condition |
|---------|-------------------------|-----------|
| BLK: nginx missing | **No** (compose path) | Use managed LB instead |
| BLK: CI deploy placeholder | **No** (if using CI deploy) | Manual deploy OK with sign-off |
| HIGH: MOCK_SMTP | Yes | If email not required day-1 |
| HIGH: FCM unconfigured | Yes | If push not required day-1 |
| HIGH: Flutterwave unconfigured | Yes | If payments not required day-1 |
| HIGH: Admin localStorage tokens | Yes | With XSS prevention awareness |
| HIGH: No backups | **No** | Risk acceptance not recommended |

---

## Security sign-off criteria

Production security sign-off requires:

1. All **Blocker** findings resolved or alternative control documented
2. All **High** findings resolved OR explicitly accepted by security owner with compensating controls
3. CORS, JWT, and metrics token verified in production environment
4. Backup + restore drill completed
5. Webhook secrets and Firebase service account stored in secret manager only

---

## Related documents

- `DEPLOYMENT_READINESS_AUDIT.md` — full infrastructure audit
- `PRODUCTION_CHECKLIST.md` — operator checklist
- `SECURITY_REVIEW_REPORT.md` — prior milestone 2 API RBAC review
- `docs/security-audit.md` — detailed control analysis
- `FIREBASE_CREDENTIALS_SECURITY_REPORT.md` — Firebase credential handling
