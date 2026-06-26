import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type SmtpConfigSnapshot = {
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  hasPassword: boolean;
  from: string;
  configured: boolean;
  missingVariables: string[];
};

export type SmtpProviderMode = 'MOCK_SMTP' | 'SMTP';

export function resolveSmtpConfig(env: Record<string, string | undefined>): SmtpConfigSnapshot {
  const host = env.SMTP_HOST?.trim() || null;
  const port = Number(env.SMTP_PORT ?? 587);
  const secure = env.SMTP_SECURE === 'true';
  const user = env.SMTP_USER?.trim() || null;
  const hasPassword = Boolean(env.SMTP_PASS?.trim());
  const from = env.SMTP_FROM?.trim() || 'WOP Platform <no-reply@wop.local>';

  const missingVariables: string[] = [];
  if (!host) missingVariables.push('SMTP_HOST');
  if (!user) missingVariables.push('SMTP_USER');
  if (!hasPassword) missingVariables.push('SMTP_PASS');

  const configured = missingVariables.length === 0;

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    user,
    hasPassword,
    from,
    configured,
    missingVariables,
  };
}

export function resolveSmtpProviderMode(env: Record<string, string | undefined>): SmtpProviderMode {
  return env.SMTP_HOST?.trim() ? 'SMTP' : 'MOCK_SMTP';
}

export function buildNodemailerTransportOptions(
  env: Record<string, string | undefined>,
): SMTPTransport.Options | null {
  const config = resolveSmtpConfig(env);
  if (!config.configured || !config.host || !config.user) {
    return null;
  }

  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: env.SMTP_PASS,
    },
  };
}

export function maskSmtpUser(user: string | null): string | null {
  if (!user) return null;
  const atIndex = user.indexOf('@');
  if (atIndex <= 1) return '***';
  return `${user.slice(0, 2)}***${user.slice(atIndex)}`;
}
