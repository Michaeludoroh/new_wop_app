import type SMTPTransport from 'nodemailer/lib/smtp-transport';

type NodemailerTransportOptions = SMTPTransport.Options & {
  pool?: boolean;
  maxConnections?: number;
};

export type EmailProviderId =
  | 'mock'
  | 'brevo'
  | 'aws'
  | 'sendgrid'
  | 'mailgun'
  | 'postmark'
  | 'smtp';

export type EmailConfigSnapshot = {
  provider: EmailProviderId;
  host: string | null;
  port: number;
  secure: boolean;
  requireTls: boolean;
  username: string | null;
  hasPassword: boolean;
  fromEmail: string | null;
  fromName: string;
  from: string;
  configured: boolean;
  missingVariables: string[];
  poolMaxConnections: number;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  usesSmtpTransport: boolean;
  displayName: string;
};

const PROVIDER_DISPLAY_NAMES: Record<EmailProviderId, string> = {
  mock: 'Mock',
  brevo: 'Brevo',
  aws: 'AWS SES',
  sendgrid: 'SendGrid',
  mailgun: 'Mailgun',
  postmark: 'Postmark',
  smtp: 'SMTP',
};

const PROVIDER_DEFAULT_HOSTS: Partial<Record<EmailProviderId, string>> = {
  brevo: 'smtp-relay.brevo.com',
  sendgrid: 'smtp.sendgrid.net',
  postmark: 'smtp.postmarkapp.com',
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readFirstDefined(
  env: Record<string, string | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

export function normalizeEmailProviderId(raw: string | undefined): EmailProviderId {
  const normalized = (raw ?? '').trim().toLowerCase();

  switch (normalized) {
    case '':
    case 'mock':
    case 'mock_smtp':
      return 'mock';
    case 'brevo':
      return 'brevo';
    case 'aws':
    case 'ses':
    case 'aws_ses':
    case 'amazon_ses':
      return 'aws';
    case 'sendgrid':
      return 'sendgrid';
    case 'mailgun':
      return 'mailgun';
    case 'postmark':
      return 'postmark';
    case 'smtp':
      return 'smtp';
    default:
      throw new Error(
        `Email configuration error: EMAIL_PROVIDER "${raw}" is invalid. Supported values: mock, brevo, aws, sendgrid, mailgun, postmark, smtp.`,
      );
  }
}

export function resolveEmailProviderId(env: Record<string, string | undefined>): EmailProviderId {
  const explicit = env.EMAIL_PROVIDER?.trim();
  if (explicit) {
    return normalizeEmailProviderId(explicit);
  }

  if (env.SMTP_HOST?.trim()) {
    return 'smtp';
  }

  return 'mock';
}

export function resolveSmtpUsername(env: Record<string, string | undefined>): string | null {
  return readFirstDefined(env, ['SMTP_USERNAME', 'SMTP_USER']) ?? null;
}

export function resolveSmtpPassword(env: Record<string, string | undefined>): string | null {
  return readFirstDefined(env, ['SMTP_PASSWORD', 'SMTP_PASS']) ?? null;
}

export function resolveFromEmail(env: Record<string, string | undefined>): string | null {
  const explicit = env.SMTP_FROM_EMAIL?.trim();
  if (explicit) {
    return explicit;
  }

  const legacyFrom = env.SMTP_FROM?.trim();
  if (!legacyFrom) {
    return null;
  }

  const angleMatch = legacyFrom.match(/<([^>]+)>/);
  if (angleMatch?.[1]) {
    return angleMatch[1].trim();
  }

  if (legacyFrom.includes('@')) {
    return legacyFrom;
  }

  return null;
}

export function resolveFromName(env: Record<string, string | undefined>): string {
  const explicit = env.SMTP_FROM_NAME?.trim();
  if (explicit) {
    return explicit;
  }

  const legacyFrom = env.SMTP_FROM?.trim();
  if (!legacyFrom) {
    return env.APP_NAME?.trim() || 'WOPP';
  }

  const angleMatch = legacyFrom.match(/^(.+?)\s*<[^>]+>$/);
  if (angleMatch?.[1]) {
    return angleMatch[1].replace(/^["']|["']$/g, '').trim();
  }

  if (legacyFrom.includes('@')) {
    return env.APP_NAME?.trim() || 'WOPP';
  }

  return legacyFrom.replace(/^["']|["']$/g, '').trim();
}

export function formatFromAddress(fromName: string, fromEmail: string | null): string {
  if (!fromEmail) {
    return fromName;
  }

  const safeName = fromName.replace(/"/g, '\\"');
  return `"${safeName}" <${fromEmail}>`;
}

export function resolveEmailConfig(env: Record<string, string | undefined>): EmailConfigSnapshot {
  const provider = resolveEmailProviderId(env);
  const host =
    env.SMTP_HOST?.trim() ||
    (provider !== 'mock' ? PROVIDER_DEFAULT_HOSTS[provider] ?? null : null);
  const port = parsePositiveInt(env.SMTP_PORT, 587);
  const secure = env.SMTP_SECURE === 'true';
  const requireTls = !secure && port === 587;
  const username = resolveSmtpUsername(env);
  const password = resolveSmtpPassword(env);
  const fromEmail = resolveFromEmail(env);
  const fromName = resolveFromName(env);
  const from = formatFromAddress(fromName, fromEmail);

  const missingVariables: string[] = [];
  if (provider !== 'mock') {
    if (!host) missingVariables.push('SMTP_HOST');
    if (!username) missingVariables.push('SMTP_USERNAME');
    if (!password) missingVariables.push('SMTP_PASSWORD');
    if (!fromEmail) missingVariables.push('SMTP_FROM_EMAIL');
  }

  const configured = provider === 'mock' || missingVariables.length === 0;

  return {
    provider,
    host,
    port,
    secure,
    requireTls,
    username,
    hasPassword: Boolean(password),
    fromEmail,
    fromName,
    from,
    configured,
    missingVariables,
    poolMaxConnections: parsePositiveInt(env.SMTP_POOL_MAX_CONNECTIONS, 5),
    connectionTimeoutMs: parsePositiveInt(env.SMTP_CONNECTION_TIMEOUT_MS, 10_000),
    greetingTimeoutMs: parsePositiveInt(env.SMTP_GREETING_TIMEOUT_MS, 10_000),
    socketTimeoutMs: parsePositiveInt(env.SMTP_SOCKET_TIMEOUT_MS, 30_000),
    maxRetries: parsePositiveInt(env.SMTP_MAX_RETRIES, 3),
    retryDelayMs: parsePositiveInt(env.SMTP_RETRY_DELAY_MS, 1000),
    usesSmtpTransport: provider !== 'mock',
    displayName: PROVIDER_DISPLAY_NAMES[provider],
  };
}

export function buildNodemailerTransportOptions(
  env: Record<string, string | undefined>,
): NodemailerTransportOptions | null {
  const config = resolveEmailConfig(env);
  if (!config.usesSmtpTransport || !config.configured || !config.host || !config.username) {
    return null;
  }

  const password = resolveSmtpPassword(env);
  if (!password) {
    return null;
  }

  return {
    pool: true,
    maxConnections: config.poolMaxConnections,
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    auth: {
      user: config.username,
      pass: password,
    },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
    socketTimeout: config.socketTimeoutMs,
    tls: {
      minVersion: 'TLSv1.2',
    },
  };
}

export function maskSmtpUser(user: string | null): string | null {
  if (!user) return null;
  const atIndex = user.indexOf('@');
  if (atIndex <= 1) return '***';
  return `${user.slice(0, 2)}***${user.slice(atIndex)}`;
}

export function validateEmailConfigForStartup(
  env: Record<string, string | undefined>,
  options?: { productionLike?: boolean },
): void {
  const config = resolveEmailConfig(env);

  if (config.provider === 'mock') {
    if (options?.productionLike) {
      throw new Error(
        'Email configuration error: EMAIL_PROVIDER must not be "mock" in production. Set EMAIL_PROVIDER=brevo (or aws, sendgrid, mailgun, postmark, smtp) with SMTP credentials.',
      );
    }
    return;
  }

  if (!config.configured) {
    throw new Error(
      `Email configuration error: ${config.displayName} provider is missing required variables: ${config.missingVariables.join(', ')}.`,
    );
  }
}
