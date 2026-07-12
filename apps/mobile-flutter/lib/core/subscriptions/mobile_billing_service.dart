import 'dart:async';
import 'dart:io';

import 'package:in_app_purchase/in_app_purchase.dart';

import 'subscription_models.dart';
import 'subscription_service.dart';

class MobileBillingConfig {
  static const String androidProductId = String.fromEnvironment(
    'MOBILE_ANDROID_PREMIUM_PRODUCT_ID',
    defaultValue: 'wopp_premium_monthly',
  );

  static const String iosProductId = String.fromEnvironment(
    'MOBILE_IOS_PREMIUM_PRODUCT_ID',
    defaultValue: 'wopp_premium_monthly',
  );

  static bool get isSupported =>
      Platform.isAndroid || Platform.isIOS;

  static String get premiumProductId =>
      Platform.isAndroid ? androidProductId : iosProductId;
}

class MobileBillingService {
  MobileBillingService({
    InAppPurchase? inAppPurchase,
    SubscriptionService? subscriptionService,
  })  : _inAppPurchase = inAppPurchase ?? InAppPurchase.instance,
        _subscriptionService = subscriptionService ?? SubscriptionService();

  final InAppPurchase _inAppPurchase;
  final SubscriptionService _subscriptionService;
  StreamSubscription<List<PurchaseDetails>>? _purchaseSubscription;

  ProductDetails? _premiumProduct;
  bool _storeAvailable = false;

  bool get isSupported => MobileBillingConfig.isSupported;
  bool get isStoreAvailable => _storeAvailable;
  ProductDetails? get premiumProduct => _premiumProduct;

  Future<void> initialize({
    required Future<void> Function(PurchaseDetails purchase) onPurchaseUpdated,
    required void Function(Object error) onError,
  }) async {
    if (!isSupported) {
      return;
    }

    _purchaseSubscription ??=
        _inAppPurchase.purchaseStream.listen((purchases) async {
      for (final purchase in purchases) {
        try {
          await onPurchaseUpdated(purchase);
        } catch (error) {
          onError(error);
        }
      }
    }, onError: onError);

    _storeAvailable = await _inAppPurchase.isAvailable();
    if (!_storeAvailable) {
      return;
    }

    final response = await _inAppPurchase.queryProductDetails({
      MobileBillingConfig.premiumProductId,
    });

    if (response.productDetails.isNotEmpty) {
      _premiumProduct = response.productDetails.first;
    }
  }

  Future<void> dispose() async {
    await _purchaseSubscription?.cancel();
    _purchaseSubscription = null;
  }

  Future<void> purchasePremium() async {
    final product = _premiumProduct;
    if (product == null) {
      throw Exception('Premium subscription product is unavailable in the store.');
    }

    final purchaseParam = PurchaseParam(productDetails: product);
    await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
  }

  Future<MobileSubscriptionVerifyResult> verifyPurchase(
    PurchaseDetails purchase,
  ) async {
    if (Platform.isAndroid) {
      final token = purchase.verificationData.serverVerificationData;
      if (token.isEmpty) {
        throw Exception('Missing Google Play purchase token.');
      }

      return _subscriptionService.verifyGooglePurchase(
        productId: purchase.productID,
        purchaseToken: token,
      );
    }

    final receipt = purchase.verificationData.serverVerificationData;
    if (receipt.isEmpty) {
      throw Exception('Missing Apple receipt data.');
    }

    return _subscriptionService.verifyApplePurchase(
      receiptData: receipt,
      productId: purchase.productID,
      transactionId: purchase.purchaseID,
    );
  }

  Future<void> completePurchase(PurchaseDetails purchase) async {
    if (purchase.pendingCompletePurchase) {
      await _inAppPurchase.completePurchase(purchase);
    }
  }

  Future<MobileSubscriptionStatusResult> getMobileStatus() {
    return _subscriptionService.getMobileStatus();
  }

  Future<MobileSubscriptionVerifyResult> restorePurchases() async {
    final restoredPurchases = <PurchaseDetails>[];
    final completer = Completer<void>();
    late StreamSubscription<List<PurchaseDetails>> restoreSubscription;

    restoreSubscription = _inAppPurchase.purchaseStream.listen((purchases) {
      restoredPurchases.addAll(
        purchases.where(
          (purchase) =>
              purchase.productID == MobileBillingConfig.premiumProductId &&
              purchase.status != PurchaseStatus.error,
        ),
      );
      if (!completer.isCompleted) {
        completer.complete();
      }
    });

    await _inAppPurchase.restorePurchases();
    await completer.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () {},
    );
    await restoreSubscription.cancel();

    if (restoredPurchases.isEmpty) {
      throw Exception('No previous purchases were found to restore.');
    }

    final latest = restoredPurchases.last;
    final verifyResult = await verifyPurchase(latest);
    await completePurchase(latest);

    await _subscriptionService.restoreMobilePurchases(
      platform: Platform.isAndroid ? 'ANDROID' : 'IOS',
      purchases: restoredPurchases
          .map(
            (purchase) => MobileRestorePurchaseItem(
              productId: purchase.productID,
              purchaseToken: Platform.isAndroid
                  ? purchase.verificationData.serverVerificationData
                  : null,
              receiptData: Platform.isIOS
                  ? purchase.verificationData.serverVerificationData
                  : null,
              transactionId: purchase.purchaseID,
            ),
          )
          .toList(),
    );

    return verifyResult;
  }
}
