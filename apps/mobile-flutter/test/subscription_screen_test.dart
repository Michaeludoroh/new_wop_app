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
      status: 'ACTIVE',
      endDate: DateTime.now().add(const Duration(days: 3)),
      access: SubscriptionAccessModel(
        hasPremiumAccess: true,
        isGracePeriod: false,
        daysRemainingInGrace: null,
        renewalDue: false,
        cancelAtPeriodEnd: false,
      ),
    );
  }

  @override
  Future<List<SubscriptionPlanModel>> getPlans() async {
    return [
      SubscriptionPlanModel(
        code: 'PREMIUM',
        name: 'Premium Membership',
        amount: 500,
        billingInterval: 'MONTHLY',
      ),
      SubscriptionPlanModel(
        code: 'BASIC_MONTHLY',
        name: 'Basic Monthly',
        amount: 9.99,
        billingInterval: 'MONTHLY',
      ),
      SubscriptionPlanModel(
        code: 'PARTNER',
        name: 'Partner',
        amount: 19.99,
        billingInterval: 'MONTHLY',
      ),
    ];
  }
}

void main() {
  testWidgets('subscription screen shows WOPP Premium without obsolete plans', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SubscriptionScreen(service: _FakeSubscriptionService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('WOPP Premium'), findsWidgets);
    expect(find.text('Choose the plan that works best for you.'), findsOneWidget);
    expect(find.text('Basic Monthly'), findsNothing);
    expect(find.text('Partner'), findsNothing);
    expect(find.textContaining('₦500'), findsNothing);
    expect(find.text('Premium Membership'), findsNothing);
    expect(find.text('Subscribe Now'), findsOneWidget);
  });
}
