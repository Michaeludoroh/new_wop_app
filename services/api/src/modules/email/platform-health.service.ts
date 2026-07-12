import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailReadinessService } from './email-readiness.service';

export type PlatformHealthCheck = {
  status: 'ok' | 'degraded' | 'skipped';
  message: string;
};

export type PlatformHealthSnapshot = {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    database: PlatformHealthCheck;
    redis: PlatformHealthCheck;
    firebase: PlatformHealthCheck;
    smtp: PlatformHealthCheck;
  };
};

@Injectable()
export class PlatformHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailReadinessService: EmailReadinessService,
  ) {}

  async getHealth(refreshEmail = true): Promise<PlatformHealthSnapshot> {
    const [database, redis, firebase, smtp] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFirebase(),
      this.checkSmtp(refreshEmail),
    ]);

    const checks = { database, redis, firebase, smtp };
    const status = Object.values(checks).some((check) => check.status === 'degraded')
      ? 'degraded'
      : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase(): Promise<PlatformHealthCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Connected' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database unavailable';
      return { status: 'degraded', message };
    }
  }

  private async checkRedis(): Promise<PlatformHealthCheck> {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      return { status: 'skipped', message: 'Not configured' };
    }

    return { status: 'ok', message: 'Configured' };
  }

  private async checkFirebase(): Promise<PlatformHealthCheck> {
    const hasJson = Boolean(this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')?.trim());
    const hasFile = Boolean(this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_FILE')?.trim());
    const hasSplit = Boolean(
      this.configService.get<string>('FCM_PROJECT_ID')?.trim() &&
        this.configService.get<string>('FCM_CLIENT_EMAIL')?.trim() &&
        this.configService.get<string>('FCM_PRIVATE_KEY')?.trim(),
    );

    if (!hasJson && !hasFile && !hasSplit) {
      return { status: 'skipped', message: 'Not configured' };
    }

    return { status: 'ok', message: 'Configured' };
  }

  private async checkSmtp(refreshEmail: boolean): Promise<PlatformHealthCheck> {
    const snapshot = refreshEmail
      ? await this.emailReadinessService.refreshConnectionTest()
      : this.emailReadinessService.getSnapshot();

    if (snapshot.provider === 'mock') {
      return { status: 'skipped', message: 'Mock provider (development)' };
    }

    if (snapshot.ready) {
      return {
        status: 'ok',
        message: snapshot.connectionMessage ?? `${snapshot.providerLabel} Connected`,
      };
    }

    return {
      status: 'degraded',
      message: snapshot.connectionError ?? `${snapshot.providerLabel} unavailable`,
    };
  }
}
