# Email Provider Setup (WOPP)

The WOPP API uses a **provider-agnostic email transport**. Application code always calls `emailService.send(...)` and never references a vendor directly.

Switch providers by changing environment variables only.

## Supported providers

| `EMAIL_PROVIDER` | Transport | Default SMTP host |
|------------------|-----------|-------------------|
| `mock` | Log-only (development) | — |
| `brevo` | Nodemailer SMTP | `smtp-relay.brevo.com` |
| `aws` | Nodemailer SMTP | *(set `SMTP_HOST` to regional SES endpoint)* |
| `sendgrid` | Nodemailer SMTP | `smtp.sendgrid.net` |
| `mailgun` | Nodemailer SMTP | *(set region host, e.g. `smtp.mailgun.org`)* |
| `postmark` | Nodemailer SMTP | `smtp.postmarkapp.com` |
| `smtp` | Nodemailer SMTP | *(requires `SMTP_HOST`)* |

If `EMAIL_PROVIDER` is unset and `SMTP_HOST` is set, the provider defaults to `smtp`.  
If neither is set, the provider defaults to `mock`.

## Required environment variables (non-mock)

```env
EMAIL_PROVIDER=brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-brevo-login-email@example.com
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM_EMAIL=noreply@your-verified-domain.com
SMTP_FROM_NAME=WOPP
```

### Optional tuning

```env
SMTP_CONNECTION_TIMEOUT_MS=10000
SMTP_GREETING_TIMEOUT_MS=10000
SMTP_SOCKET_TIMEOUT_MS=30000
SMTP_POOL_MAX_CONNECTIONS=5
SMTP_MAX_RETRIES=3
SMTP_RETRY_DELAY_MS=1000
```

### Legacy aliases (still supported)

- `SMTP_USER` → `SMTP_USERNAME`
- `SMTP_PASS` → `SMTP_PASSWORD`
- `SMTP_FROM` → parsed into `SMTP_FROM_NAME` + `SMTP_FROM_EMAIL`

## Brevo production setup

1. Create a Brevo SMTP key: **Transactional → Email → SMTP & API**
2. Verify your sender domain in Brevo
3. Authorize your server outbound IP: **Settings → Security → Authorized IPs**
4. Configure:

```env
EMAIL_PROVIDER=brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-login@example.com
SMTP_PASSWORD=your-smtp-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=WOPP
```

## Switch to AWS SES later (no code changes)

```env
EMAIL_PROVIDER=aws
SMTP_HOST=email-smtp.eu-west-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USERNAME=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=WOPP
```

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health/platform` | Database, Redis, Firebase, SMTP summary |
| `GET /api/v1/health/email` | Detailed email provider readiness |

Example SMTP check when Brevo is connected:

```json
{
  "checks": {
    "smtp": {
      "status": "ok",
      "message": "Brevo Connected"
    }
  }
}
```

If SMTP is unavailable, the platform health status becomes `degraded` but **the API keeps running**.

## Startup validation

- **Development:** incomplete email config logs warnings; mock provider is allowed.
- **Production/staging:** `EMAIL_PROVIDER=mock` fails fast. Missing `SMTP_USERNAME`, `SMTP_PASSWORD`, or `SMTP_FROM_EMAIL` fails fast with a clear error.

## Architecture

```
EmailService
  └── EmailProvider (DI token)
        ├── MockEmailProvider
        ├── BrevoEmailProvider      ─┐
        ├── AwsSesEmailProvider      ├── BaseSmtpEmailProvider → SmtpTransportService (Nodemailer pool)
        ├── SendGridEmailProvider    │
        ├── MailgunEmailProvider     │
        ├── PostmarkEmailProvider    │
        └── GenericSmtpEmailProvider ┘
```

Templates, retry logic, and all business modules (`auth`, `notifications`, `payments`, etc.) are unchanged.
