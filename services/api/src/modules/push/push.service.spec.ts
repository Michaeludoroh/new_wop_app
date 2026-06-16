import { ForbiddenException } from '@nestjs/common';
import { PushDeliveryStatus } from '@prisma/client';
import { PushPlatform } from './dto/device-token.dto';
import { PushDeliveryAttempt } from './push.providers/push-provider.interface';
import { PushService } from './push.service';

function createService(
  providerAttempts: PushDeliveryAttempt[] = [
    { token: 'token-1', success: true, retryable: false, providerMessageId: 'msg-1' },
  ],
) {
  const prisma = {
    pushDeviceToken: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ id: 'old-id', userId: 'user-1', token: 'old-token', deviceId: 'device-1' }),
      findMany: jest.fn().mockResolvedValue([{ token: 'token-1', userId: 'user-1' }]),
      upsert: jest.fn().mockResolvedValue({ id: 'token-id', token: 'token-1', userId: 'user-1' }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    pushDeliveryLog: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      update: jest.fn().mockResolvedValue({ id: 'log-1' }),
    },
  };
  const provider = {
    sendToTokens: jest.fn().mockResolvedValue({ provider: 'FCM', attempts: providerAttempts }),
  };

  return {
    service: new PushService(prisma as never, provider as never),
    prisma,
    provider,
  };
}

describe('PushService token lifecycle', () => {
  it('registers a new device token', async () => {
    const { service, prisma } = createService();

    await service.registerToken({ sub: 'user-1', role: 'USER' }, {
      token: 'token-1',
      platform: PushPlatform.ANDROID,
      deviceId: 'device-1',
    });

    expect(prisma.pushDeviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'token-1' },
        update: expect.objectContaining({ userId: 'user-1', revokedAt: null }),
      }),
    );
  });

  it('blocks a user from registering another user owned token', async () => {
    const { service, prisma } = createService();
    prisma.pushDeviceToken.findFirst.mockResolvedValueOnce({ userId: 'user-2' });

    await expect(
      service.registerToken({ sub: 'user-1', role: 'USER' }, {
        token: 'token-1',
        platform: PushPlatform.ANDROID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes old token and upserts replacement on refresh', async () => {
    const { service, prisma } = createService();

    await service.refreshToken({ sub: 'user-1', role: 'USER' }, {
      oldToken: 'old-token',
      newToken: 'new-token',
      platform: PushPlatform.IOS,
    });

    expect(prisma.pushDeviceToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'old-id' } }),
    );
    expect(prisma.pushDeviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'new-token' } }),
    );
  });

  it('revokes a token', async () => {
    const { service, prisma } = createService();

    await service.revokeToken({ sub: 'user-1', role: 'USER' }, { token: 'old-token' });

    expect(prisma.pushDeviceToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );
  });
});

describe('PushService delivery reliability', () => {
  it('logs successful FCM delivery attempts', async () => {
    const { service, prisma } = createService();

    await service.sendToUser('user-1', {
      dedupeKey: 'notification.created:1',
      category: 'NOTIFICATION',
      title: 'Hello',
      body: 'World',
    });

    expect(prisma.pushDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
          status: PushDeliveryStatus.SENT,
          providerMessageId: 'msg-1',
        }),
      }),
    );
  });

  it('invalidates non-retryable invalid FCM tokens', async () => {
    const { service, prisma } = createService([
      {
        token: 'token-1',
        success: false,
        retryable: false,
        errorCode: 'messaging/registration-token-not-registered',
        errorMessage: 'not registered',
      },
    ]);

    await service.sendToUser('user-1', {
      dedupeKey: 'notification.created:2',
      category: 'NOTIFICATION',
      title: 'Hello',
      body: 'World',
    });

    expect(prisma.pushDeviceToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'token-1', revokedAt: null } }),
    );
  });

  it('prevents duplicate broadcast delivery by dedupe key', async () => {
    const { service, prisma, provider } = createService();
    prisma.pushDeliveryLog.findFirst.mockResolvedValueOnce({ id: 'existing-log' });

    await service.sendBroadcast({
      dedupeKey: 'announcement.published:1',
      category: 'NOTIFICATION',
      title: 'Announcement',
      body: 'Body',
    });

    expect(provider.sendToTokens).not.toHaveBeenCalled();
  });

  it('retries due delivery logs', async () => {
    const { service, prisma } = createService();
    prisma.pushDeliveryLog.findMany.mockResolvedValueOnce([
      {
        id: 'log-1',
        userId: 'user-1',
        token: 'token-1',
        dedupeKey: 'notification.created:1',
        category: 'NOTIFICATION',
        retryCount: 1,
        providerMessageId: null,
        payload: { title: 'Hello', body: 'World', data: { notificationId: '1' } },
      },
    ]);

    await service.retryDueDeliveries();

    expect(prisma.pushDeliveryLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
          status: PushDeliveryStatus.SENT,
          retryCount: 2,
        }),
      }),
    );
  });
});
