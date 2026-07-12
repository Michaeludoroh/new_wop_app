import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import 'subscription_models.dart';

class SubscriptionService {
  SubscriptionService({AuthenticatedDio? authenticatedDio})
      : _dio = (authenticatedDio ?? AuthenticatedDio()).dio;

  final Dio _dio;
  List<SubscriptionPlanModel> _cachedPlans = const [];

  Future<SubscriptionStatusModel?> getStatus() async {
    final response = await _dio.get<dynamic>('/subscriptions/status');
    final map = _asMap(response.data);
    final data = map['data'];
    if (data == null) return null;
    if (data is Map) {
      return SubscriptionStatusModel.fromJson(
        data.map((k, v) => MapEntry(k.toString(), v)),
      );
    }
    return SubscriptionStatusModel.fromJson(map);
  }

  Future<void> validateContentAccess({
    required String token,
    required String resourceType,
    required String resourceId,
  }) async {
    final response = await _dio.get<dynamic>(
      '/subscriptions/content/validate',
      queryParameters: {
        'token': token,
        'resourceType': resourceType,
        'resourceId': resourceId,
      },
    );
    final map = _asMap(response.data);
    final valid = map['valid'] == true;
    if (!valid) {
      throw Exception(map['reason']?.toString() ?? 'Content access validation failed');
    }
  }

  Future<List<SubscriptionPlanModel>> getPlans() async {
    final response = await _dio.get<dynamic>('/subscriptions/plans');
    final map = _asMap(response.data);
    final data = map['data'];
    if (data is List) {
      final plans = data
          .whereType<Map>()
          .map((item) => SubscriptionPlanModel.fromJson(
                item.map((k, v) => MapEntry(k.toString(), v)),
              ))
          .toList();
      _cachedPlans = plans;
      return plans;
    }
    return const [];
  }

  Future<void> subscribe({
    required MembershipPlan plan,
    String billingInterval = 'MONTHLY',
  }) async {
    await _dio.post<dynamic>(
      '/subscriptions/subscribe',
      data: {
        'planCode': await resolvePlanCode(plan, billingInterval: billingInterval),
        'metadata': {'billingInterval': billingInterval},
      },
    );
  }

  Future<void> cancel({bool immediate = false, String? reason}) async {
    await _dio.post<dynamic>(
      '/subscriptions/cancel',
      data: {
        'immediate': immediate,
        if (reason != null) 'reason': reason,
      },
    );
  }

  Future<MobileSubscriptionVerifyResult> verifyGooglePurchase({
    required String productId,
    required String purchaseToken,
  }) async {
    final response = await _dio.post<dynamic>(
      '/mobile/subscriptions/google/verify',
      data: {
        'productId': productId,
        'purchaseToken': purchaseToken,
      },
    );

    return MobileSubscriptionVerifyResult.fromJson(_asMap(response.data));
  }

  Future<MobileSubscriptionVerifyResult> verifyApplePurchase({
    required String receiptData,
    String? productId,
    String? transactionId,
  }) async {
    final response = await _dio.post<dynamic>(
      '/mobile/subscriptions/apple/verify',
      data: {
        'receiptData': receiptData,
        if (productId != null) 'productId': productId,
        if (transactionId != null) 'transactionId': transactionId,
      },
    );

    return MobileSubscriptionVerifyResult.fromJson(_asMap(response.data));
  }

  Future<MobileSubscriptionStatusResult> getMobileStatus() async {
    final response = await _dio.get<dynamic>('/mobile/subscriptions/status');
    return MobileSubscriptionStatusResult.fromJson(_asMap(response.data));
  }

  Future<MobileSubscriptionVerifyResult> restoreMobilePurchases({
    required String platform,
    required List<MobileRestorePurchaseItem> purchases,
  }) async {
    final response = await _dio.post<dynamic>(
      '/mobile/subscriptions/restore',
      data: {
        'platform': platform,
        'purchases': purchases.map((item) => item.toJson()).toList(),
      },
    );

    return MobileSubscriptionVerifyResult.fromJson(_asMap(response.data));
  }

  Future<String> resolvePlanCode(
    MembershipPlan plan, {
    String billingInterval = 'MONTHLY',
  }) async {
    if (_cachedPlans.isEmpty) {
      try {
        await getPlans();
      } catch (_) {
        // Fall back to static codes when plans cannot be loaded.
      }
    }

    final fromApi = _matchPlanFromApi(plan, billingInterval);
    if (fromApi != null) return fromApi;

    return _fallbackPlanCode(plan);
  }

  String? _matchPlanFromApi(MembershipPlan plan, String billingInterval) {
    if (_cachedPlans.isEmpty) return null;

    final normalizedInterval = billingInterval.toUpperCase();
    bool matchesPlan(SubscriptionPlanModel candidate) {
      final code = candidate.code.toUpperCase();
      return switch (plan) {
        MembershipPlan.free => code == 'FREE' || candidate.amount <= 0,
        MembershipPlan.premium =>
          code.contains('PREMIUM') || code.contains('BASIC') || candidate.amount > 0,
        MembershipPlan.partner => code.contains('PARTNER'),
        MembershipPlan.unknown => code == 'FREE',
      };
    }

    final intervalMatches = _cachedPlans.where(
      (candidate) =>
          matchesPlan(candidate) &&
          candidate.billingInterval.toUpperCase() == normalizedInterval,
    );
    if (intervalMatches.isNotEmpty) {
      return intervalMatches.first.code;
    }

    final anyMatch = _cachedPlans.where(matchesPlan);
    return anyMatch.isNotEmpty ? anyMatch.first.code : null;
  }

  String _fallbackPlanCode(MembershipPlan plan) {
    return switch (plan) {
      MembershipPlan.free => 'FREE',
      MembershipPlan.premium => 'PREMIUM',
      MembershipPlan.partner => 'PARTNER',
      MembershipPlan.unknown => 'FREE',
    };
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return <String, dynamic>{};
  }
}
