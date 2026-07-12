import {
  buildNodemailerTransportOptions,
  resolveEmailConfig,
  resolveEmailProviderId,
  maskSmtpUser,
} from './email-config.util';

export {
  buildNodemailerTransportOptions,
  formatFromAddress,
  maskSmtpUser,
  resolveEmailConfig,
  resolveEmailProviderId,
  resolveFromEmail,
  resolveFromName,
  resolveSmtpPassword,
  resolveSmtpUsername,
  type EmailConfigSnapshot,
  type EmailProviderId,
} from './email-config.util';

/** @deprecated Use resolveEmailProviderId() and EmailProviderId instead. */
export type SmtpProviderMode = 'MOCK_SMTP' | 'SMTP';

/** @deprecated Use EmailConfigSnapshot instead. */
export type SmtpConfigSnapshot = {
  host: string | null;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user: string | null;
  hasPassword: boolean;
  from: string;
  configured: boolean;
  missingVariables: string[];
  poolMaxConnections: number;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
};

/** @deprecated Use resolveEmailConfig() instead. */
export function resolveSmtpConfig(env: Record<string, string | undefined>): SmtpConfigSnapshot {
  const config = resolveEmailConfig(env);
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTls: config.requireTls,
    user: config.username,
    hasPassword: config.hasPassword,
    from: config.from,
    configured: config.configured,
    missingVariables: config.missingVariables,
    poolMaxConnections: config.poolMaxConnections,
    connectionTimeoutMs: config.connectionTimeoutMs,
    greetingTimeoutMs: config.greetingTimeoutMs,
    socketTimeoutMs: config.socketTimeoutMs,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
  };
}

/** @deprecated Use resolveEmailProviderId() instead. */
export function resolveSmtpProviderMode(env: Record<string, string | undefined>): SmtpProviderMode {
  const provider = resolveEmailProviderId(env);
  return provider === 'mock' ? 'MOCK_SMTP' : 'SMTP';
}
