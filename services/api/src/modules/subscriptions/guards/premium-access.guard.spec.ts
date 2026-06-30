import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PremiumAccessGuard } from './premium-access.guard';
import { SubscriptionsService } from '../subscriptions.service';

describe('PremiumAccessGuard', () => {
  const subscriptionsService = {
    userHasPremiumAccess: jest.fn(),
  } as unknown as SubscriptionsService;

  const guard = new PremiumAccessGuard(subscriptionsService);

  function createContext(user?: { sub: string; role: string }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
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
});
