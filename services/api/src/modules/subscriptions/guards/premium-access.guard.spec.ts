import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PremiumAccessGuard } from './premium-access.guard';
import { SubscriptionsService } from '../subscriptions.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PremiumAccessGuard', () => {
  const subscriptionsService = {
    userHasPremiumAccess: jest.fn(),
  } as unknown as SubscriptionsService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'REQUIRE_EMAIL_VERIFICATION') return 'true';
      return undefined;
    }),
  } as unknown as ConfigService;

  const guard = new PremiumAccessGuard(
    subscriptionsService,
    prisma,
    configService,
  );

  function createContext(user?: { sub: string; role: string }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ emailVerified: true });
  });

  it('returns 403 when user is missing', async () => {
    await expect(guard.canActivate(createContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows admin roles without checking subscription', async () => {
    await expect(
      guard.canActivate(createContext({ sub: 'admin_1', role: 'ADMIN' })),
    ).resolves.toBe(true);
    expect(subscriptionsService.userHasPremiumAccess).not.toHaveBeenCalled();
  });

  it('allows users with premium access', async () => {
    (subscriptionsService.userHasPremiumAccess as jest.Mock).mockResolvedValue(true);

    await expect(
      guard.canActivate(createContext({ sub: 'user_1', role: 'USER' })),
    ).resolves.toBe(true);
  });

  it('blocks users without premium access', async () => {
    (subscriptionsService.userHasPremiumAccess as jest.Mock).mockResolvedValue(false);

    await expect(
      guard.canActivate(createContext({ sub: 'user_1', role: 'USER' })),
    ).rejects.toMatchObject({
      response: { message: 'Subscription required' },
    });
  });

  it('blocks unverified users when email verification is required', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ emailVerified: false });

    await expect(
      guard.canActivate(createContext({ sub: 'user_1', role: 'USER' })),
    ).rejects.toMatchObject({
      response: { message: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' },
    });
    expect(subscriptionsService.userHasPremiumAccess).not.toHaveBeenCalled();
  });
});
