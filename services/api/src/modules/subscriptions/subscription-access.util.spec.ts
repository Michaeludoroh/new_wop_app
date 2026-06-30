import { SubscriptionStatus } from '@prisma/client';
import {
  buildSubscriptionSummary,
  hasPremiumAccess,
  isTrialActive,
  REGISTRATION_TRIAL_DAYS,
  trialDaysRemaining,
} from './subscription-access.util';

describe('subscription-access.util', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('grants premium access during an active registration trial', () => {
    const subscription = {
      status: SubscriptionStatus.PENDING,
      trialEndsAt: new Date('2026-06-05T12:00:00.000Z'),
      metadata: { isRegistrationTrial: true },
    };

    expect(isTrialActive(subscription, now)).toBe(true);
    expect(hasPremiumAccess(subscription, now)).toBe(true);
    expect(trialDaysRemaining(subscription, now)).toBe(4);
  });

  it('denies premium access after trial expiry', () => {
    const subscription = {
      status: SubscriptionStatus.EXPIRED,
      trialEndsAt: new Date('2026-05-30T12:00:00.000Z'),
      metadata: { isRegistrationTrial: true },
    };

    expect(hasPremiumAccess(subscription, now)).toBe(false);
    expect(buildSubscriptionSummary(subscription, now)).toEqual(
      expect.objectContaining({
        isTrial: false,
        subscriptionRequired: true,
      }),
    );
  });

  it('keeps premium access for active subscribers', () => {
    const subscription = {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date('2026-07-01T12:00:00.000Z'),
    };

    expect(hasPremiumAccess(subscription, now)).toBe(true);
    expect(buildSubscriptionSummary(subscription, now)).toEqual(
      expect.objectContaining({
        isSubscribed: true,
        subscriptionRequired: false,
      }),
    );
  });

  it('uses the configured 7-day registration trial length', () => {
    expect(REGISTRATION_TRIAL_DAYS).toBe(7);
  });
});
