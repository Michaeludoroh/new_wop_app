import { Prisma, SubscriptionStatus } from '@prisma/client';

export const REGISTRATION_TRIAL_DAYS = 7;
export const DEFAULT_PREMIUM_PLAN_CODE = 'PREMIUM';

export type SubscriptionAccessRecord = {
  status: SubscriptionStatus;
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  graceEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  metadata?: Prisma.JsonValue | null;
};

export function asSubscriptionMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isRegistrationTrial(subscription: SubscriptionAccessRecord): boolean {
  return asSubscriptionMetadata(subscription.metadata).isRegistrationTrial === true;
}

export function isTrialActive(
  subscription: SubscriptionAccessRecord,
  now = new Date(),
): boolean {
  if (subscription.status !== SubscriptionStatus.PENDING) {
    return false;
  }

  if (!subscription.trialEndsAt) {
    return false;
  }

  return subscription.trialEndsAt.getTime() > now.getTime();
}

export function isPaidSubscriptionActive(
  subscription: SubscriptionAccessRecord,
  now = new Date(),
): boolean {
  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return true;
  }

  if (subscription.status === SubscriptionStatus.GRACE) {
    if (subscription.graceEndsAt && subscription.graceEndsAt.getTime() < now.getTime()) {
      return false;
    }
    return true;
  }

  return false;
}

export function hasPremiumAccess(
  subscription: SubscriptionAccessRecord | null | undefined,
  now = new Date(),
): boolean {
  if (!subscription) {
    return false;
  }

  if (isPaidSubscriptionActive(subscription, now)) {
    return true;
  }

  return isTrialActive(subscription, now);
}

export function trialDaysRemaining(
  subscription: SubscriptionAccessRecord,
  now = new Date(),
): number | null {
  if (!isTrialActive(subscription, now) || !subscription.trialEndsAt) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

export function buildSubscriptionSummary(
  subscription: SubscriptionAccessRecord | null | undefined,
  now = new Date(),
) {
  const trialActive = subscription ? isTrialActive(subscription, now) : false;
  const subscribed = subscription ? isPaidSubscriptionActive(subscription, now) : false;
  const premiumAccess = hasPremiumAccess(subscription, now);
  const daysRemaining = subscription ? trialDaysRemaining(subscription, now) : null;

  return {
    isTrial: trialActive,
    trialEndsAt: trialActive ? subscription?.trialEndsAt?.toISOString() ?? null : null,
    daysRemaining,
    isSubscribed: subscribed,
    subscriptionRequired: !premiumAccess,
    hasPremiumAccess: premiumAccess,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionEndsAt: subscription?.currentPeriodEnd?.toISOString() ?? null,
  };
}
