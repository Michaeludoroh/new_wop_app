import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  maskSecretKey,
  resolveFlutterwaveConfig,
  resolveFlutterwaveProviderMode,
  testFlutterwaveApiCredentials,
  type FlutterwaveProviderMode,
} from './flutterwave-config.util';

export type FlutterwaveConnectionTestResult = 'skipped' | 'passed' | 'failed';

export type FlutterwaveReadinessSnapshot = {
  ready: boolean;
  provider: FlutterwaveProviderMode;
  configured: boolean;
  webhookReady: boolean;
  connectionTest: FlutterwaveConnectionTestResult;
  connectionError: string | null;
  missingVariables: string[];
  redirectBaseUrl: string;
  secretKeyPreview: string | null;
  webhookSecretConfigured: boolean;
  capabilities: {
    checkout: boolean;
    verification: boolean;
    webhooks: boolean;
    subscriptionRenewal: boolean;
  };
};

@Injectable()
export class FlutterwaveReadinessService implements OnModuleInit {
  private readonly logger = new Logger(FlutterwaveReadinessService.name);
  private snapshot: FlutterwaveReadinessSnapshot;

  constructor(private readonly configService: ConfigService) {
    this.snapshot = this.buildSnapshot('skipped', null);
  }

  onModuleInit() {
    void this.runStartupDiagnostics();
  }

  getSnapshot(): FlutterwaveReadinessSnapshot {
    return { ...this.snapshot };
  }

  async refreshConnectionTest(): Promise<FlutterwaveReadinessSnapshot> {
    const env = this.readEnv();
    const provider = resolveFlutterwaveProviderMode(env);
    const config = resolveFlutterwaveConfig(env);

    if (provider === 'NOT_CONFIGURED') {
      this.snapshot = this.buildSnapshot('skipped', null);
      return this.getSnapshot();
    }

    const secretKey = env.FLUTTERWAVE_SECRET_KEY!.trim();
    const result = await testFlutterwaveApiCredentials(secretKey);

    if (result.passed) {
      this.snapshot = this.buildSnapshot('passed', null);
      this.logger.log('Flutterwave API connection test passed');
    } else {
      this.snapshot = this.buildSnapshot('failed', result.error);
      this.logger.warn(`Flutterwave API connection test failed: ${result.error}`);
    }

    return this.getSnapshot();
  }

  private async runStartupDiagnostics() {
    const env = this.readEnv();
    const provider = resolveFlutterwaveProviderMode(env);
    const config = resolveFlutterwaveConfig(env);

    if (provider === 'NOT_CONFIGURED') {
      this.snapshot = this.buildSnapshot('skipped', null);
      this.logger.warn(
        `Flutterwave not configured (missing: ${config.missingVariables.join(', ') || 'FLUTTERWAVE_SECRET_KEY'})`,
      );
      return;
    }

    this.logger.log(
      `Flutterwave configured — secretKey=${maskSecretKey(env.FLUTTERWAVE_SECRET_KEY)} webhookSecret=${config.webhookSecretConfigured ? 'set' : 'missing'} redirectBaseUrl=${config.redirectBaseUrl}`,
    );

    await this.refreshConnectionTest();
  }

  private buildSnapshot(
    connectionTest: FlutterwaveConnectionTestResult,
    connectionError: string | null,
  ): FlutterwaveReadinessSnapshot {
    const env = this.readEnv();
    const provider = resolveFlutterwaveProviderMode(env);
    const config = resolveFlutterwaveConfig(env);

    const capabilities = {
      checkout: config.secretKeyConfigured,
      verification: config.secretKeyConfigured,
      webhooks: config.webhookReady,
      subscriptionRenewal: config.secretKeyConfigured,
    };

    const ready =
      provider === 'FLUTTERWAVE' &&
      config.configured &&
      connectionTest === 'passed';

    return {
      ready,
      provider,
      configured: config.configured,
      webhookReady: config.webhookReady,
      connectionTest,
      connectionError,
      missingVariables: config.missingVariables,
      redirectBaseUrl: config.redirectBaseUrl,
      secretKeyPreview: maskSecretKey(env.FLUTTERWAVE_SECRET_KEY),
      webhookSecretConfigured: config.webhookSecretConfigured,
      capabilities,
    };
  }

  private readEnv(): Record<string, string | undefined> {
    return {
      FLUTTERWAVE_SECRET_KEY: this.configService.get<string>('FLUTTERWAVE_SECRET_KEY'),
      FLUTTERWAVE_WEBHOOK_SECRET: this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET'),
      PAYMENT_REDIRECT_BASE_URL: this.configService.get<string>('PAYMENT_REDIRECT_BASE_URL'),
      NEXT_PUBLIC_API_BASE_URL: this.configService.get<string>('NEXT_PUBLIC_API_BASE_URL'),
    };
  }
}
