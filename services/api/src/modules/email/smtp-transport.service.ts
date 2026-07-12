import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  buildNodemailerTransportOptions,
  resolveEmailConfig,
} from './email-config.util';

@Injectable()
export class SmtpTransportService implements OnModuleDestroy {
  private readonly logger = new Logger(SmtpTransportService.name);
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private transporterKey: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null {
    const env = this.readEnv();
    const config = resolveEmailConfig(env);
    if (!config.usesSmtpTransport) {
      return null;
    }

    const options = buildNodemailerTransportOptions(env);
    if (!options) {
      return null;
    }

    const key = JSON.stringify({
      host: options.host,
      port: options.port,
      secure: options.secure,
      user: options.auth?.user,
    });

    if (!this.transporter || this.transporterKey !== key) {
      if (this.transporter) {
        this.transporter.close();
      }
      this.transporter = nodemailer.createTransport(options);
      this.transporterKey = key;
      this.logger.log(
        `SMTP pooled transport initialized for ${config.displayName} (${config.host}:${config.port})`,
      );
    }

    return this.transporter;
  }

  async verifyConnection(): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new Error('SMTP transport options incomplete');
    }
    await transporter.verify();
  }

  async onModuleDestroy() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.transporterKey = null;
      this.logger.log('SMTP transport closed');
    }
  }

  private readEnv(): Record<string, string | undefined> {
    return {
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
