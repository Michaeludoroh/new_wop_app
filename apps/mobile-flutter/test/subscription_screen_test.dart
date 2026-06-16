import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_models.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_service.dart';
import 'package:ministry_mobile/screens/subscription_screen.dart';

class _FakeSubscriptionService extends SubscriptionService {
  @override
  Future<SubscriptionStatusModel?> getStatus() async {
    return SubscriptionStatusModel(
      plan: MembershipPlan.premium,
      status: 'GRACE',
      endDate: DateTime.now().add(const Duration(days: 3)),
      access: SubscriptionAccessModel(
        hasPremiumAccess: true,
        isGracePeriod: true,
        daysRemainingInGrace: 3,
        renewalDue: true,
        cancelAtPeriodEnd: false,
      ),
    );
  }

  @override
  Future<List<SubscriptionPlanModel>> getPlans() async {
    return [
      SubscriptionPlanModel(
        code: 'PREMIUM',
        name: 'Premium',
        amount: 25,
        billingInterval: 'MONTHLY',
      ),
    ];
  }
}

void main() {
  testWidgets('subscription screen shows grace-period messaging', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SubscriptionScreen(service: _FakeSubscriptionService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Subscription'), findsOneWidget);
    expect(find.text('Premium'), findsWidgets);
    expect(find.textContaining('Payment issue detected'), findsOneWidget);
    expect(find.text('Renew Membership'), findsOneWidget);
  });
}
