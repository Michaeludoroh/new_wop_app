import 'subscription_models.dart';

/// Server-driven trial and subscription helpers for the mobile app.
class TrialManager {
  const TrialManager._();

  static bool hasPremiumAccess(SubscriptionStatusModel? status) {
    return status?.hasPremiumAccess ?? false;
  }

  static bool isTrialActive(SubscriptionStatusModel? status) {
    return status?.isTrial ?? false;
  }

  static bool subscriptionRequired(SubscriptionStatusModel? status) {
    return status?.subscriptionRequired ?? true;
  }

  static bool shouldGatePremiumContent(SubscriptionStatusModel? status) {
    return !hasPremiumAccess(status);
  }

  static String? bannerTitle(SubscriptionStatusModel? status) {
    if (isTrialActive(status)) {
      return 'Welcome!';
    }
    if (subscriptionRequired(status) && !(status?.isSubscribed ?? false)) {
      return 'Trial ended';
    }
    return null;
  }

  static String bannerMessage(SubscriptionStatusModel? status) {
    if (isTrialActive(status)) {
      final days = status?.trialDaysRemaining ?? 0;
      final dayLabel = days == 1 ? 'day' : 'days';
      return 'You are enjoying a FREE 7-day trial.\n'
          '$days $dayLabel remaining.\n'
          'Subscribe for only ₦500/month before your trial expires.';
    }

    if (subscriptionRequired(status)) {
      return 'Your free trial has ended.\n'
          'Subscribe for only ₦500/month to continue using WOPP.';
    }

    return '';
  }

  static bool showTrialBanner(SubscriptionStatusModel? status) {
    return isTrialActive(status) ||
        (subscriptionRequired(status) && !(status?.isSubscribed ?? false));
  }
}
