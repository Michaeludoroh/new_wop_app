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

  static int? remainingTrialDays(SubscriptionStatusModel? status) {
    if (!isTrialActive(status)) {
      return null;
    }
    return status?.trialDaysRemaining ?? status?.access?.daysRemaining;
  }
}
