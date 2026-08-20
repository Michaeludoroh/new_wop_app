import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';

import '../http/api_error.dart';
import 'apple_receipt_payload.dart';
import 'mobile_billing_exception.dart';
import 'premium_store_products.dart';
import 'subscription_models.dart';
import 'subscription_service.dart';

export 'premium_store_products.dart';

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
  final Map<String, ProductDetails> _premiumProducts = {};
  bool _storeAvailable = false;
  List<String> _notFoundProductIds = const [];
  String? _lastQueryErrorCode;
  String? _lastQueryErrorMessage;
  final Set<String> _inFlightVerificationKeys = {};
  final Set<String> _completedPurchaseKeys = {};
  final Map<String, Future<MobileSubscriptionVerifyResult>> _verifyByKey = {};
  final List<PurchaseDetails> _streamPurchases = [];

  bool get isSupported => MobileBillingConfig.isSupported;
  bool get isStoreAvailable => _storeAvailable;
  ProductDetails? get premiumProduct =>
      _premiumProducts[MobileBillingConfig.premiumProductId] ?? _premiumProduct;

  List<WoppPremiumOffer> get availableOffers {
    final offers = _premiumProducts.values
        .map(
          (product) => WoppPremiumOffer(
            productId: product.id,
            displayName: MobileBillingConfig.displayNameFor(product.id),
            priceLabel: product.price,
          ),
        )
        .toList()
      ..sort(
        (a, b) => MobileBillingConfig.sortOrderFor(a.productId).compareTo(
          MobileBillingConfig.sortOrderFor(b.productId),
        ),
      );
    return offers;
  }

  List<String> get notFoundProductIds => List.unmodifiable(_notFoundProductIds);

  String? get storeSetupMessage {
    if (!isSupported) {
      return 'WOPP Premium is billed through the App Store or Google Play on a mobile device.';
    }
    if (!_storeAvailable) {
      return Platform.isIOS
          ? 'In-App Purchases are unavailable on this device. Sign in to the App Store and check Screen Time restrictions.'
          : 'Google Play Billing is unavailable on this device.';
    }
    if (_premiumProducts.isEmpty) {
      return _productMissingMessage();
    }
    return null;
  }

  Future<void> initialize({
    required Future<void> Function(PurchaseDetails purchase) onPurchaseUpdated,
    required void Function(Object error) onError,
  }) async {
    if (!isSupported) {
      _log('initialize skipped: platform does not support native billing');
      return;
    }

    _purchaseSubscription ??=
        _inAppPurchase.purchaseStream.listen((purchases) async {
      _streamPurchases.addAll(purchases);
      for (final purchase in purchases) {
        _logPurchase(purchase);
        try {
          await onPurchaseUpdated(purchase);
        } catch (error, stackTrace) {
          _log('purchaseStream handler error: $error');
          _log('$stackTrace');
          onError(error);
        }
      }
    }, onError: (Object error, StackTrace stackTrace) {
      _log('purchaseStream error: $error');
      _log('$stackTrace');
      onError(error);
    });

    _storeAvailable = await _inAppPurchase.isAvailable();
    _log(
      'isAvailable=$_storeAvailable productId=${MobileBillingConfig.premiumProductId}',
    );
    if (!_storeAvailable) {
      return;
    }

    await _queryPremiumProducts();
  }

  Future<void> dispose() async {
    await _purchaseSubscription?.cancel();
    _purchaseSubscription = null;
  }

  Future<void> purchasePremium() async {
    await purchaseOffer(MobileBillingConfig.premiumProductId);
  }

  Future<void> purchaseOffer(String productId) async {
    if (!isSupported) {
      throw MobileBillingException(
        'WOPP Premium is available through the App Store or Google Play on a mobile device.',
        code: 'PLATFORM_UNSUPPORTED',
      );
    }

    _storeAvailable = await _inAppPurchase.isAvailable();
    _log('purchaseOffer isAvailable=$_storeAvailable productId=$productId');
    if (!_storeAvailable) {
      throw MobileBillingException(
        Platform.isIOS
            ? 'In-App Purchases are unavailable. Sign in to the App Store and check Screen Time restrictions.'
            : 'Google Play Billing is unavailable on this device.',
        code: 'STORE_UNAVAILABLE',
      );
    }

    if (_premiumProducts.isEmpty) {
      await _queryPremiumProducts();
    }

    final product = _premiumProducts[productId] ??
        (productId == MobileBillingConfig.premiumProductId ? _premiumProduct : null);
    if (product == null) {
      throw MobileBillingException(
        _productMissingMessage(),
        code: 'PRODUCT_NOT_FOUND',
        debugDetails: 'notFoundIDs=$_notFoundProductIds queryError=$_lastQueryErrorCode',
      );
    }

    _log(
      'starting buyNonConsumable product=${product.id} title=${product.title} price=${product.price}',
    );

    final purchaseParam = _purchaseParam(product);
    final started = await _inAppPurchase.buyNonConsumable(
      purchaseParam: purchaseParam,
    );
    if (!started) {
      throw MobileBillingException(
        'The store did not start the subscription purchase. Please try again.',
        code: 'PURCHASE_NOT_STARTED',
      );
    }
  }

  Future<MobileSubscriptionVerifyResult> verifyPurchase(
    PurchaseDetails purchase,
  ) async {
    final key = _purchaseKey(purchase);
    final inFlight = _verifyByKey[key];
    if (inFlight != null) {
      _log('verifyPurchase deduped key=$key');
      return inFlight;
    }

    final future = _verifyPurchaseOnce(purchase);
    _verifyByKey[key] = future;
    try {
      return await future;
    } finally {
      _verifyByKey.remove(key);
    }
  }

  Future<void> completePurchase(PurchaseDetails purchase) async {
    if (!purchase.pendingCompletePurchase) {
      return;
    }

    final key = _purchaseKey(purchase);
    if (_completedPurchaseKeys.contains(key)) {
      _log('completePurchase already finished key=$key');
      return;
    }

    if (Platform.isIOS &&
        (purchase.purchaseID == null || purchase.purchaseID!.isEmpty)) {
      _log('completePurchase skipped: missing purchaseID on iOS');
      return;
    }

    await _inAppPurchase.completePurchase(purchase);
    _completedPurchaseKeys.add(key);
    _log('completePurchase finished key=$key');
  }

  Future<MobileSubscriptionStatusResult> getMobileStatus() {
    return _subscriptionService.getMobileStatus();
  }

  Future<MobileSubscriptionVerifyResult> restorePurchases() async {
    if (!isSupported) {
      throw MobileBillingException(
        'Restore is only available on iOS and Android.',
        code: 'PLATFORM_UNSUPPORTED',
      );
    }

    _storeAvailable = await _inAppPurchase.isAvailable();
    if (!_storeAvailable) {
      throw MobileBillingException(
        Platform.isIOS
            ? 'In-App Purchases are unavailable, so purchases cannot be restored.'
            : 'Google Play Billing is unavailable, so purchases cannot be restored.',
        code: 'STORE_UNAVAILABLE',
      );
    }

    _streamPurchases.clear();
    _log('restorePurchases started productIds=${MobileBillingConfig.premiumProductIds}');
    await _inAppPurchase.restorePurchases();

    final deadline = DateTime.now().add(const Duration(seconds: 8));
    List<PurchaseDetails> restoredPurchases = const [];
    while (DateTime.now().isBefore(deadline)) {
      restoredPurchases = _streamPurchases
          .where(
            (purchase) =>
                MobileBillingConfig.isPremiumProductId(purchase.productID) &&
                purchase.status != PurchaseStatus.error &&
                purchase.status != PurchaseStatus.canceled,
          )
          .toList();
      if (restoredPurchases.isNotEmpty) {
        break;
      }
      await Future<void>.delayed(const Duration(milliseconds: 200));
    }

    if (restoredPurchases.isEmpty) {
      throw MobileBillingException(
        'No previous purchases were found to restore.',
        code: 'NO_PURCHASES_TO_RESTORE',
      );
    }

    final latest = restoredPurchases.last;
    final verifyResult = await verifyPurchase(latest);
    await completePurchase(latest);

    await _subscriptionService.restoreMobilePurchases(
      platform: Platform.isAndroid ? 'ANDROID' : 'IOS',
      purchases: [
        for (final purchase in restoredPurchases)
          MobileRestorePurchaseItem(
            productId: purchase.productID,
            purchaseToken: Platform.isAndroid
                ? purchase.verificationData.serverVerificationData
                : null,
            receiptData:
                Platform.isIOS ? await _appleReceiptForVerification(purchase) : null,
            transactionId: purchase.purchaseID,
          ),
      ],
    );

    return verifyResult;
  }

  Future<MobileSubscriptionVerifyResult> _verifyPurchaseOnce(
    PurchaseDetails purchase,
  ) async {
    final key = _purchaseKey(purchase);
    if (!_inFlightVerificationKeys.add(key)) {
      throw MobileBillingException(
        'This purchase is already being verified.',
        code: 'VERIFY_IN_FLIGHT',
      );
    }

    try {
      if (Platform.isAndroid) {
        final token = purchase.verificationData.serverVerificationData;
        if (token.isEmpty) {
          throw MobileBillingException(
            'Missing Google Play purchase token.',
            code: 'MISSING_PLAY_TOKEN',
          );
        }

        _log(
          'verifyGoogle product=${purchase.productID} transactionId=${purchase.purchaseID} source=${purchase.verificationData.source}',
        );
        try {
          return await _subscriptionService.verifyGooglePurchase(
            productId: purchase.productID,
            purchaseToken: token,
          );
        } catch (error, stackTrace) {
          _log(
            'verifyGoogle failed status=${apiHttpStatus(error)} code=${apiErrorCode(error)} message=${messageFromDio(error, fallback: 'Google Play verification failed')}',
          );
          _log('$stackTrace');
          throw MobileBillingException(
            messageFromDio(
              error,
              fallback: 'Google Play could not verify this purchase. Please try again.',
            ),
            code: apiErrorCode(error) ?? 'GOOGLE_VERIFICATION_FAILED',
          );
        }
      }

      final receipt = await _appleReceiptForVerification(purchase);
      _log(
        'verifyApple product=${purchase.productID} transactionId=${purchase.purchaseID} source=${purchase.verificationData.source} payloadKind=${applePayloadKind(receipt)}',
      );

      try {
        return await _subscriptionService.verifyApplePurchase(
          receiptData: receipt,
          productId: purchase.productID,
          transactionId: purchase.purchaseID,
        );
      } catch (error, stackTrace) {
        _log(
          'verifyApple failed status=${apiHttpStatus(error)} code=${apiErrorCode(error)} message=${messageFromDio(error, fallback: 'Apple verification failed')}',
        );
        _log('$stackTrace');
        throw MobileBillingException(
          messageFromDio(
            error,
            fallback:
                'Apple could not verify this purchase. Try Restore purchases if you were charged.',
          ),
          code: apiErrorCode(error) ?? 'APPLE_VERIFICATION_FAILED',
        );
      }
    } finally {
      _inFlightVerificationKeys.remove(key);
    }
  }

  Future<void> _queryPremiumProducts() async {
    final productIds = MobileBillingConfig.premiumProductIds;
    final response = await _inAppPurchase.queryProductDetails(productIds);
    _notFoundProductIds = response.notFoundIDs.toList();
    _lastQueryErrorCode = response.error?.code;
    _lastQueryErrorMessage = response.error?.message;
    _premiumProducts
      ..clear()
      ..addEntries(
        response.productDetails
            .where((item) => MobileBillingConfig.isPremiumProductId(item.id))
            .map((item) => MapEntry(item.id, item)),
      );

    _premiumProduct = _premiumProducts[MobileBillingConfig.premiumProductId] ??
        (_premiumProducts.isEmpty ? null : _premiumProducts.values.first);

    final product = _premiumProduct;
    _log(
      'queryProductDetails requested=$productIds found=${response.productDetails.map((item) => item.id).toList()} notFoundIDs=$_notFoundProductIds title=${product?.title} price=${product?.price} queryError=$_lastQueryErrorCode $_lastQueryErrorMessage',
    );
  }

  PurchaseParam _purchaseParam(ProductDetails product) {
    if (Platform.isAndroid && product is GooglePlayProductDetails) {
      return GooglePlayPurchaseParam(
        productDetails: product,
        offerToken: product.offerToken,
      );
    }
    return PurchaseParam(productDetails: product);
  }

  Future<String> _appleReceiptForVerification(PurchaseDetails purchase) async {
    final raw = purchase.verificationData.serverVerificationData.trim();
    if (raw.isEmpty) {
      throw MobileBillingException(
        'Missing Apple purchase verification data.',
        code: 'MISSING_APPLE_RECEIPT',
      );
    }

    if (!looksLikeAppleJws(raw)) {
      return raw;
    }

    _log('StoreKit 2 JWS detected; refreshing app receipt for Apple verifyReceipt');
    try {
      final addition =
          _inAppPurchase.getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
      final refreshed = await addition.refreshPurchaseVerificationData();
      final receipt = refreshed?.serverVerificationData.trim() ?? '';
      if (receipt.isNotEmpty && !looksLikeAppleJws(receipt)) {
        _log('Using refreshed app receipt for Apple verification');
        return receipt;
      }
    } catch (error) {
      _log('refreshPurchaseVerificationData failed: $error');
    }

    _log('Falling back to StoreKit 2 JWS for backend verification');
    return raw;
  }

  String _productMissingMessage() {
    final storeName = Platform.isIOS ? 'App Store' : 'Google Play';
    if (_lastQueryErrorMessage != null && _lastQueryErrorMessage!.trim().isNotEmpty) {
      return 'Could not load WOPP Premium from $storeName (${_lastQueryErrorCode ?? 'error'}). Please try again.';
    }
    if (_notFoundProductIds.isNotEmpty || _premiumProducts.isEmpty) {
      return 'WOPP Premium is not available from $storeName on this build yet. Each option must be an auto-renewable subscription in a submitted subscription group.';
    }
    return 'WOPP Premium is unavailable in the store.';
  }

  String _purchaseKey(PurchaseDetails purchase) {
    return purchase.purchaseID ??
        '${purchase.productID}:${purchase.transactionDate ?? 'unknown'}';
  }

  void _logPurchase(PurchaseDetails purchase) {
    final payload = purchase.verificationData.serverVerificationData;
    _log(
      'purchaseStream status=${purchase.status} product=${purchase.productID} purchaseID=${purchase.purchaseID} errorCode=${purchase.error?.code} errorMessage=${purchase.error?.message} pendingComplete=${purchase.pendingCompletePurchase} source=${purchase.verificationData.source} payloadKind=${applePayloadKind(payload)}',
    );
  }

  void _log(String message) {
    debugPrint('[billing] $message');
  }
}
