import 'dart:io';

/// Store SKUs for WOPP Premium. All of these grant the canonical PREMIUM entitlement.
class MobileBillingConfig {
  static const String androidMonthlyProductId = String.fromEnvironment(
    'MOBILE_ANDROID_PREMIUM_PRODUCT_ID',
    defaultValue: 'wopp_premium_monthly',
  );

  static const String iosMonthlyProductId = String.fromEnvironment(
    'MOBILE_IOS_PREMIUM_PRODUCT_ID',
    defaultValue: 'wopp_premium_monthly',
  );

  static const String androidQuarterlyProductId = String.fromEnvironment(
    'MOBILE_ANDROID_PREMIUM_QUARTERLY_PRODUCT_ID',
    defaultValue: 'wopp_premium_quarterly',
  );

  static const String iosQuarterlyProductId = String.fromEnvironment(
    'MOBILE_IOS_PREMIUM_QUARTERLY_PRODUCT_ID',
    defaultValue: 'wopp_premium_quarterly',
  );

  static const String androidYearlyProductId = String.fromEnvironment(
    'MOBILE_ANDROID_PREMIUM_YEARLY_PRODUCT_ID',
    defaultValue: 'wopp_premium_yearly',
  );

  static const String iosYearlyProductId = String.fromEnvironment(
    'MOBILE_IOS_PREMIUM_YEARLY_PRODUCT_ID',
    defaultValue: 'wopp_premium_yearly',
  );

  static bool get isSupported => Platform.isAndroid || Platform.isIOS;

  /// Existing monthly SKU. Do not rename this identifier.
  static String get premiumProductId =>
      Platform.isAndroid ? androidMonthlyProductId : iosMonthlyProductId;

  static Set<String> get premiumProductIds {
    if (Platform.isAndroid) {
      return {
        androidMonthlyProductId,
        androidQuarterlyProductId,
        androidYearlyProductId,
      };
    }
    return {
      iosMonthlyProductId,
      iosQuarterlyProductId,
      iosYearlyProductId,
    };
  }

  static bool isPremiumProductId(String productId) =>
      premiumProductIds.contains(productId);

  static String displayNameFor(String productId) {
    final normalized = productId.toLowerCase();
    if (normalized.contains('year') || normalized.contains('annual')) {
      return 'WOPP Premium Yearly';
    }
    if (normalized.contains('quarter')) {
      return 'WOPP Premium Quarterly';
    }
    return 'WOPP Premium Monthly';
  }

  static int sortOrderFor(String productId) {
    final normalized = productId.toLowerCase();
    if (normalized.contains('year') || normalized.contains('annual')) {
      return 2;
    }
    if (normalized.contains('quarter')) {
      return 1;
    }
    return 0;
  }
}

class WoppPremiumOffer {
  const WoppPremiumOffer({
    required this.productId,
    required this.displayName,
    required this.priceLabel,
  });

  final String productId;
  final String displayName;
  final String priceLabel;
}
