import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  maskSmtpUser,
  resolveEmailConfig,
  validateEmailConfigForStartup,
  type EmailProviderId,
} from './email-config.util';
import {
  EMAIL_PROVIDER_TOKEN,
  EmailProvider,
} from './email.provider.interface';

export type EmailConnectionTestResult = 'skipped' | 'passed' | 'failed';

export type EmailReadinessSnapshot = {
  ready: boolean;
  provider: EmailProviderId;
  providerLabel: string;
  configured: boolean;
  connectionTest: EmailConnectionTestResult;
  connectionError: string | null;
  connectionMessage: string | null;
  missingVariables: string[];
  host: string | null;
  port: number;
  secure: boolean;
  requireTls: boolean;
  pooled: boolean;
  from: string;
  smtpUser: string | null;
};

@Injectable()
export class EmailReadinessService implements OnModuleInit {
  private readonly logger = new Logger(EmailReadinessService.name);
  private snapshot: EmailReadinessSnapshot;

  constructor(
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: EmailProvider,
  ) {
    this.snapshot = this.buildSnapshot('skipped', null);
  }

  onModuleInit() {
    void this.runStartupDiagnostics();
  }

  getSnapshot(): EmailReadinessSnapshot {
    return { ...this.snapshot };
  }

  async refreshConnectionTest(): Promise<EmailReadinessSnapshot> {
    const config = resolveEmailConfig(this.readEnv());

    if (config.provider === 'mock') {
      this.snapshot = this.buildSnapshot('skipped', null);
      return this.getSnapshot();
    }

    if (!config.configured) {
      this.snapshot = this.buildSnapshot(
        'failed',
        `Missing required variables: ${config.missingVariables.join(', ')}`,
      );
      return this.getSnapshot();
    }

    try {
      if (this.emailProvider.verifyConnection) {
        await this.emailProvider.verifyConnection();
      }
      this.snapshot = this.buildSnapshot('passed', null);
      this.logger.log(`${config.displayName} SMTP connection test passed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMTP connection error';
      this.snapshot = this.buildSnapshot('failed', message);
      this.logger.warn(`${config.displayName} SMTP connection test failed: ${message}`);
    }

    return this.getSnapshot();
  }

  private async runStartupDiagnostics() {
    const env = this.readEnv();
    const config = resolveEmailConfig(env);
    const productionLike = ['production', 'staging'].includes(
      String(env.NODE_ENV ?? 'development'),
    );

    try {
      validateEmailConfigForStartup(env, { productionLike });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message);
      if (productionLike) {
        throw error;
      }
    }

    if (config.provider === 'mock') {
      this.snapshot = this.buildSnapshot('skipped', null);
      this.logger.warn(
        `Email provider: mock (set EMAIL_PROVIDER=brevo and SMTP credentials for production delivery)`,
      );
      return;
    }

    this.logger.log(
      `Email provider configured — provider=${config.provider} label=${config.displayName} host=${config.host} port=${config.port} secure=${config.secure} requireTls=${config.requireTls} pooled=true user=${maskSmtpUser(config.username)} from=${config.from}`,
    );

    await this.refreshConnectionTest();
  }

  private buildSnapshot(
    connectionTest: EmailConnectionTestResult,
    connectionError: string | null,
  ): EmailReadinessSnapshot {
    const config = resolveEmailConfig(this.readEnv());

    const ready =
      config.provider !== 'mock' && config.configured && connectionTest === 'passed';

    const connectionMessage =
      connectionTest === 'passed'
        ? `${config.displayName} Connected`
        : connectionTest === 'skipped'
          ? `${config.displayName} (mock mode)`
          : connectionError;

    return {
      ready,
      provider: config.provider,
      providerLabel: config.displayName,
      configured: config.configured,
      connectionTest,
      connectionError,
      connectionMessage,
      missingVariables: config.missingVariables,
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTls: config.requireTls,
      pooled: config.usesSmtpTransport,
      from: config.from,
      smtpUser: maskSmtpUser(config.username),
    };
  }

  private readEnv(): Record<string, string | undefined> {
    return {
      NODE_ENV: this.configService.get<string>('NODE_ENV'),
      EMAIL_PROVIDER: this.configService.get<string>('EMAIL_PROVIDER'),
      APP_NAME: this.configService.get<string>('APP_NAME'),
      SMTP_HOST: this.configService.get<string>('SMTP_HOST'),
      SMTP_PORT: this.configService.get<string>('SMTP_PORT'),
      SMTP_SECURE: this.configService.get<string>('SMTP_SECURE'),
      SMTP_USERNAME: this.configService.get<string>('SMTP_USERNAME'),
      SMTP_PASSWORD: this.configService.get<string>('SMTP_PASSWORD'),
      SMTP_USER: this.configService.get<string>('SMTP_USER'),
      SMTP_PASS: this.configService.get<string>('SMTP_PASS'),
      SMTP_FROM_EMAIL: this.configService.get<string>('SMTP_FROM_EMAIL'),
      SMTP_FROM_NAME: this.configService.get<string>('SMTP_FROM_NAME'),
      SMTP_FROM: this.configService.get<string>('SMTP_FROM'),
      SMTP_CONNECTION_TIMEOUT_MS: this.configService.get<string>('SMTP_CONNECTION_TIMEOUT_MS'),
      SMTP_GREETING_TIMEOUT_MS: this.configService.get<string>('SMTP_GREETING_TIMEOUT_MS'),
      SMTP_SOCKET_TIMEOUT_MS: this.configService.get<string>('SMTP_SOCKET_TIMEOUT_MS'),
      SMTP_POOL_MAX_CONNECTIONS: this.configService.get<string>('SMTP_POOL_MAX_CONNECTIONS'),
      SMTP_MAX_RETRIES: this.configService.get<string>('SMTP_MAX_RETRIES'),
      SMTP_RETRY_DELAY_MS: this.configService.get<string>('SMTP_RETRY_DELAY_MS'),
    };
  }
}
