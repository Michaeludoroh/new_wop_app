import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_models.dart';
import 'package:ministry_mobile/core/subscriptions/trial_manager.dart';

SubscriptionStatusModel _status({
  required bool hasPremium,
  bool isTrial = false,
  bool subscriptionRequired = false,
  int? daysRemaining,
}) {
  return SubscriptionStatusModel(
    plan: MembershipPlan.premium,
    status: isTrial ? 'PENDING' : (hasPremium ? 'ACTIVE' : 'EXPIRED'),
    access: SubscriptionAccessModel(
      hasPremiumAccess: hasPremium,
      isGracePeriod: false,
      renewalDue: false,
      cancelAtPeriodEnd: false,
      isTrial: isTrial,
      daysRemaining: daysRemaining,
      subscriptionRequired: subscriptionRequired,
    ),
  );
}

void main() {
  group('TrialManager', () {
    test('shows banner during active trial', () {
      final status = _status(
        hasPremium: true,
        isTrial: true,
        subscriptionRequired: false,
        daysRemaining: 5,
      );

      expect(TrialManager.isTrialActive(status), isTrue);
      expect(TrialManager.showTrialBanner(status), isTrue);
      expect(TrialManager.bannerMessage(status), contains('5 days remaining'));
    });

    test('requires subscription after trial expiry', () {
      final status = _status(
        hasPremium: false,
        subscriptionRequired: true,
      );

      expect(TrialManager.shouldGatePremiumContent(status), isTrue);
      expect(TrialManager.bannerMessage(status), contains('trial has ended'));
    });

    test('allows premium content for subscribers', () {
      final status = _status(hasPremium: true, subscriptionRequired: false);

      expect(TrialManager.shouldGatePremiumContent(status), isFalse);
      expect(TrialManager.showTrialBanner(status), isFalse);
    });
  });
}
