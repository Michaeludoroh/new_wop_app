import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/subscriptions/premium_store_products.dart';

void main() {
  test('maps store product ids to WOPP Premium display names', () {
    expect(
      MobileBillingConfig.displayNameFor('wopp_premium_monthly'),
      'WOPP Premium Monthly',
    );
    expect(
      MobileBillingConfig.displayNameFor('wopp_premium_quarterly'),
      'WOPP Premium Quarterly',
    );
    expect(
      MobileBillingConfig.displayNameFor('wopp_premium_yearly'),
      'WOPP Premium Yearly',
    );
  });

  test('orders monthly, quarterly, then yearly', () {
    expect(MobileBillingConfig.sortOrderFor('wopp_premium_monthly'), 0);
    expect(MobileBillingConfig.sortOrderFor('wopp_premium_quarterly'), 1);
    expect(MobileBillingConfig.sortOrderFor('wopp_premium_yearly'), 2);
  });
}
