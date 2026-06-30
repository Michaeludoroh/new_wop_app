import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_models.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_provider.dart';
import 'package:ministry_mobile/core/subscriptions/trial_manager.dart';
import 'package:ministry_mobile/widgets/subscription_gate.dart';
import 'package:ministry_mobile/widgets/trial_banner.dart';

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

class _FakeSubscriptionProvider extends SubscriptionProvider {
  _FakeSubscriptionProvider(this._status, {this.isLoading = false});

  final SubscriptionStatusModel? _status;
  final bool isLoading;

  @override
  SubscriptionStatusModel? get status => _status;

  @override
  bool get loading => isLoading;

  @override
  Future<void> refresh() async {}
}

void main() {
  group('SubscriptionGate', () {
    testWidgets('shows premium content during active trial', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: SubscriptionScope(
            notifier: _FakeSubscriptionProvider(
              _status(hasPremium: true, isTrial: true, daysRemaining: 5),
            ),
            child: const SubscriptionGate(
              child: Scaffold(body: Text('Premium content')),
            ),
          ),
        ),
      );

      expect(find.text('Premium content'), findsOneWidget);
      expect(find.text('Subscription Required'), findsNothing);
    });

    testWidgets('blocks premium content after trial expiry', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: SubscriptionScope(
            notifier: _FakeSubscriptionProvider(
              _status(hasPremium: false, subscriptionRequired: true),
            ),
            child: const SubscriptionGate(
              child: Scaffold(body: Text('Premium content')),
            ),
          ),
        ),
      );

      expect(find.text('Premium content'), findsNothing);
      expect(find.text('Subscription Required'), findsWidgets);
    });
  });

  group('TrialManager payment restoration', () {
    test('allows premium content after successful subscription', () {
      final status = _status(hasPremium: true, subscriptionRequired: false);

      expect(TrialManager.shouldGatePremiumContent(status), isFalse);
      expect(TrialManager.showTrialBanner(status), isFalse);
    });
  });
}
