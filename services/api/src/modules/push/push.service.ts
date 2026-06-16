import { ForbiddenException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PushDeliveryStatus } from '@prisma/client';
import {
  PushDeliveryResult,
  PushMessage,
  PushProvider,
} from './push.providers/push-provider.interface';
import {
  RefreshDeviceTokenDto,
  RegisterDeviceTokenDto,
  RevokeDeviceTokenDto,
} from './dto/device-token.dto';

type RequestUser = {
  sub: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
};

@Injectable()
export class PushService {
  private readonly maxRetryCount = 3;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PUSH_PROVIDER') private readonly provider: PushProvider,
  ) {}

  async registerToken(user: RequestUser, dto: RegisterDeviceTokenDto) {
    const existing = await this.prisma.pushDeviceToken.findFirst({
      where: {
        token: dto.token,
      },
    });

    if (existing && existing.userId !== user.sub && user.role === 'USER') {
      throw new ForbiddenException('Cannot register a token owned by another user');
    }

    const upserted = await this.prisma.pushDeviceToken.upsert({
      where: { token: dto.token },
      update: {
        userId: user.sub,
        platform: dto.platform,
        deviceId: dto.deviceId ?? null,
        revokedAt: null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.sub,
        token: dto.token,
        platform: dto.platform,
        deviceId: dto.deviceId ?? null,
      },
    });

    return { data: upserted };
  }

  async refreshToken(user: RequestUser, dto: RefreshDeviceTokenDto) {
    const oldRecord = await this.prisma.pushDeviceToken.findUnique({
      where: { token: dto.oldToken },
    });

    if (!oldRecord) {
      throw new NotFoundException('Old token not found');
    }

    if (oldRecord.userId !== user.sub && user.role === 'USER') {
      throw new ForbiddenException('Cannot refresh a token owned by another user');
    }

    await this.prisma.pushDeviceToken.update({
      where: { id: oldRecord.id },
      data: { revokedAt: new Date() },
    });

    const replacement = await this.prisma.pushDeviceToken.upsert({
      where: { token: dto.newToken },
      update: {
        userId: oldRecord.userId,
        platform: dto.platform,
        deviceId: dto.deviceId ?? oldRecord.deviceId,
        revokedAt: null,
      },
      create: {
        userId: oldRecord.userId,
        token: dto.newToken,
        platform: dto.platform,
        deviceId: dto.deviceId ?? oldRecord.deviceId,
      },
    });

    return { data: replacement };
  }

  async revokeToken(user: RequestUser, dto: RevokeDeviceTokenDto) {
    const record = await this.prisma.pushDeviceToken.findUnique({
      where: { token: dto.token },
    });

    if (!record) {
      return { message: 'Token already absent or revoked' };
    }

    if (record.userId !== user.sub && user.role === 'USER') {
      throw new ForbiddenException('Cannot revoke a token owned by another user');
    }

    await this.prisma.pushDeviceToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Token revoked' };
  }

  async listMyDevices(user: RequestUser) {
    const rows = await this.prisma.pushDeviceToken.findMany({
      where: { userId: user.sub },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        token: true,
        platform: true,
        deviceId: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { data: rows };
  }

  async sendToUser(userId: string, message: PushMessage) {
    const tokenRows = await this.prisma.pushDeviceToken.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (tokenRows.length === 0) {
      return { message: 'No active push tokens for user', data: { attempts: 0 } };
    }

    const dedupeMarker = await this.prisma.pushDeliveryLog.findFirst({
      where: { dedupeKey: message.dedupeKey },
      select: { id: true },
    });

    if (dedupeMarker) {
      return {
        message: 'Duplicate delivery prevented',
        data: { dedupeKey: message.dedupeKey, attempts: 0 },
      };
    }

    return this.dispatchToTokenRows(tokenRows, message);
  }

  async sendBroadcast(message: PushMessage) {
    const tokenRows = await this.prisma.pushDeviceToken.findMany({
      where: {
        revokedAt: null,
        user: { deletedAt: null },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (tokenRows.length === 0) {
      return { message: 'No active push tokens for broadcast', data: { attempts: 0 } };
    }

    const dedupeMarker = await this.prisma.pushDeliveryLog.findFirst({
      where: { dedupeKey: message.dedupeKey },
      select: { id: true },
    });

    if (dedupeMarker) {
      return {
        message: 'Duplicate delivery prevented',
        data: { dedupeKey: message.dedupeKey, attempts: 0 },
      };
    }

    return this.dispatchToTokenRows(tokenRows, message);
  }

  async retryDueDeliveries(limit = 100) {
    const due = await this.prisma.pushDeliveryLog.findMany({
      where: {
        success: false,
        retryable: true,
        retryCount: { lt: this.maxRetryCount },
        nextRetryAt: { lte: new Date() },
      },
      orderBy: [{ nextRetryAt: 'asc' }],
      take: limit,
    });

    let retried = 0;
    let succeeded = 0;
    let failed = 0;

    for (const row of due) {
      const payload = this.asRecord(row.payload);
      const data = this.asRecord(payload.data);
      const message: PushMessage = {
        dedupeKey: `${row.dedupeKey}:retry:${row.retryCount + 1}`,
        category: row.category,
        title: String(payload.title ?? ''),
        body: String(payload.body ?? ''),
        data: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        ),
      };

      const result = await this.provider.sendToTokens([row.token], message);
      const attempt = result.attempts[0];
      retried += 1;

      const nextRetryCount = row.retryCount + 1;
      const exhausted = !attempt.success && (!attempt.retryable || nextRetryCount >= this.maxRetryCount);
      await this.prisma.pushDeliveryLog.update({
        where: { id: row.id },
        data: {
          success: attempt.success,
          status: attempt.success
            ? PushDeliveryStatus.SENT
            : exhausted
              ? PushDeliveryStatus.FAILED
              : PushDeliveryStatus.RETRYING,
          providerMessageId: attempt.providerMessageId ?? row.providerMessageId,
          errorCode: attempt.errorCode ?? null,
          errorMessage: attempt.errorMessage ?? null,
          retryable: !attempt.success && attempt.retryable && !exhausted,
          retryCount: nextRetryCount,
          nextRetryAt:
            !attempt.success && attempt.retryable && !exhausted
              ? new Date(Date.now() + 5 * 60 * 1000)
              : null,
        },
      });

      if (attempt.success) succeeded += 1;
      else failed += 1;

      if (!attempt.success && this.shouldInvalidateToken(attempt.errorCode)) {
        await this.invalidateToken(row.token);
      }
    }

    return { data: { retried, succeeded, failed } };
  }

  private async dispatchToTokenRows(
    tokenRows: Array<{ token: string; userId: string }>,
    message: PushMessage,
  ) {
    const result = await this.provider.sendToTokens(
      tokenRows.map((row) => row.token),
      message,
    );

    const userByToken = new Map(tokenRows.map((row) => [row.token, row.userId]));
    await this.persistDeliveryResult(message, result, userByToken);

    return {
      message: 'Push dispatch processed',
      data: {
        provider: result.provider,
        attempts: result.attempts.length,
        success: result.attempts.filter((a) => a.success).length,
        failed: result.attempts.filter((a) => !a.success).length,
      },
    };
  }

  private async persistDeliveryResult(
    message: PushMessage,
    result: PushDeliveryResult,
    userByToken: Map<string, string>,
  ) {
    const now = new Date();

    for (const attempt of result.attempts) {
      const userId = userByToken.get(attempt.token);
      if (!userId) continue;
      const exhausted = !attempt.success && (!attempt.retryable || this.maxRetryCount <= 1);
      await this.prisma.pushDeliveryLog.create({
        data: {
          userId,
          token: attempt.token,
          dedupeKey: message.dedupeKey,
          category: message.category,
          provider: result.provider,
          status: attempt.success
            ? PushDeliveryStatus.SENT
            : exhausted
              ? PushDeliveryStatus.FAILED
              : PushDeliveryStatus.RETRYING,
          success: attempt.success,
          providerMessageId: attempt.providerMessageId ?? null,
          errorCode: attempt.errorCode ?? null,
          errorMessage: attempt.errorMessage ?? null,
          retryable: !attempt.success && attempt.retryable && !exhausted,
          retryCount: attempt.success ? 0 : 1,
          nextRetryAt:
            !attempt.success && attempt.retryable
              ? new Date(now.getTime() + 5 * 60 * 1000)
              : null,
          maxRetryCount: this.maxRetryCount,
          payload: {
            title: message.title,
            body: message.body,
            data: message.data ?? {},
          },
        },
      });

      if (!attempt.success && this.shouldInvalidateToken(attempt.errorCode)) {
        await this.invalidateToken(attempt.token);
      }
    }
  }

  private shouldInvalidateToken(errorCode?: string) {
    return [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/invalid-argument',
      'FCM_TOKEN_INVALID',
    ].includes(errorCode ?? '');
  }

  private async invalidateToken(token: string) {
    await this.prisma.pushDeviceToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }
}
