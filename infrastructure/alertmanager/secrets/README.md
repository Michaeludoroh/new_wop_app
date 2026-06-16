# Alertmanager secret files

Create these files in this directory before starting Alertmanager in non-demo environments:

- `slack_webhook_url`
- `discord_webhook_url`

Each file must contain only the raw webhook URL value (no quotes, no extra spaces/newlines).

Example (PowerShell):
```powershell
Set-Content -NoNewline -Path infrastructure/alertmanager/secrets/slack_webhook_url -Value "https://hooks.slack.com/services/..."
Set-Content -NoNewline -Path infrastructure/alertmanager/secrets/discord_webhook_url -Value "https://discord.com/api/webhooks/..."
```

For local development without real integrations, you can place placeholder valid URLs:
- `http://webhook-relay:8080/slack`
- `http://webhook-relay:8080/discord`
