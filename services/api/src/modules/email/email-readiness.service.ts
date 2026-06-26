import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  buildNodemailerTransportOptions,
  maskSmtpUser,
  resolveSmtpConfig,
  resolveSmtpProviderMode,
  type SmtpProviderMode,
} from './smtp-config.util';

export type SmtpConnectionTestResult = 'skipped' | 'passed' | 'failed';

export type EmailReadinessSnapshot = {
  ready: boolean;
  provider: SmtpProviderMode;
  configured: boolean;
  connectionTest: SmtpConnectionTestResult;
  connectionError: string | null;
  missingVariables: string[];
  host: string | null;
  port: number;
  secure: boolean;
  from: string;
  smtpUser: string | null;
};

@Injectable()
export class EmailReadinessService implements OnModuleInit {
  private readonly logger = new Logger(EmailReadinessService.name);
  private snapshot: EmailReadinessSnapshot;

  constructor(private readonly configService: ConfigService) {
    this.snapshot = this.buildSnapshot('skipped', null);
  }

  onModuleInit() {
    void this.runStartupDiagnostics();
  }

  getSnapshot(): EmailReadinessSnapshot {
    return { ...this.snapshot };
  }

  async refreshConnectionTest(): Promise<EmailReadinessSnapshot> {
    const env = this.readEnv();
    const provider = resolveSmtpProviderMode(env);
    const config = resolveSmtpConfig(env);

    if (provider === 'MOCK_SMTP') {
      this.snapshot = this.buildSnapshot('skipped', null);
      return this.getSnapshot();
    }

    const transportOptions = buildNodemailerTransportOptions(env);
    if (!transportOptions) {
      this.snapshot = this.buildSnapshot('failed', 'SMTP transport options incomplete');
      return this.getSnapshot();
    }

    try {
      const transporter = nodemailer.createTransport(transportOptions);
      await transporter.verify();
      this.snapshot = this.buildSnapshot('passed', null);
      this.logger.log('SMTP connection test passed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMTP connection error';
      this.snapshot = this.buildSnapshot('failed', message);
      this.logger.warn(`SMTP connection test failed: ${message}`);
    }

    return this.getSnapshot();
  }

  private async runStartupDiagnostics() {
    const env = this.readEnv();
    const provider = resolveSmtpProviderMode(env);
    const config = resolveSmtpConfig(env);

    if (provider === 'MOCK_SMTP') {
      this.snapshot = this.buildSnapshot('skipped', null);
      this.logger.warn(
        `SMTP not configured — email provider: MOCK_SMTP (missing: ${config.missingVariables.join(', ') || 'SMTP_HOST'})`,
      );
      return;
    }

    this.logger.log(
      `SMTP configured — email provider: SMTP host=${config.host} port=${config.port} secure=${config.secure} user=${maskSmtpUser(config.user)} from=${config.from}`,
    );

    await this.refreshConnectionTest();
  }

  private buildSnapshot(
    connectionTest: SmtpConnectionTestResult,
    connectionError: string | null,
  ): EmailReadinessSnapshot {
    const env = this.readEnv();
    const provider = resolveSmtpProviderMode(env);
    const config = resolveSmtpConfig(env);

    const ready =
      provider === 'MOCK_SMTP'
        ? false
        : config.configured && connectionTest === 'passed';

    return {
      ready,
      provider,
      configured: config.configured,
      connectionTest,
      connectionError,
      missingVariables: config.missingVariables,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: config.from,
      smtpUser: maskSmtpUser(config.user),
    };
  }

  private readEnv(): Record<string, string | undefined> {
    return {
      SMTP_HOST: this.configService.get<string>('SMTP_HOST'),
      SMTP_PORT: this.configService.get<string>('SMTP_PORT'),
      SMTP_SECURE: this.configService.get<string>('SMTP_SECURE'),
      SMTP_USER: this.configService.get<string>('SMTP_USER'),
      SMTP_PASS: this.configService.get<string>('SMTP_PASS'),
      SMTP_FROM: this.configService.get<string>('SMTP_FROM'),
    };
  }
}
