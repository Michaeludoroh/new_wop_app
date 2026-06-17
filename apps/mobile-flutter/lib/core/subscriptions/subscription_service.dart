import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'subscription_models.dart';

class SubscriptionService {
  SubscriptionService({
    Dio? dio,
    TokenStorageService? tokenStorageService,
  })  : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AuthApiConfig.baseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                sendTimeout: const Duration(seconds: 20),
                headers: {'Content-Type': 'application/json'},
              ),
            ),
        _tokenStorageService = tokenStorageService ?? TokenStorageService();

  final Dio _dio;
  final TokenStorageService _tokenStorageService;
  List<SubscriptionPlanModel>? _cachedPlans;

  Future<SubscriptionStatusModel?> getStatus() async {
    final response = await _authorizedGet('/subscriptions/status');
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

  Future<List<SubscriptionPlanModel>> getPlans() async {
    final response = await _authorizedGet('/subscriptions/plans');
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

  Future<PaymentCheckoutResult> initiateCheckout({
    required MembershipPlan plan,
    String billingInterval = 'MONTHLY',
  }) async {
    final planCode = await _resolvePlanCode(plan, billingInterval: billingInterval);
    final response = await _authorizedPost(
      '/payments/checkout/subscription',
      data: {
        'planCode': planCode,
        'autoRenew': true,
      },
    );

    return PaymentCheckoutResult.fromJson(_asMap(response.data));
  }

  Future<void> subscribe({
    required MembershipPlan plan,
    String billingInterval = 'MONTHLY',
  }) async {
    await _authorizedPost(
      '/subscriptions/subscribe',
      data: {
        'planCode': await _resolvePlanCode(plan, billingInterval: billingInterval),
        'metadata': {'billingInterval': billingInterval},
      },
    );
  }

  Future<void> cancel({bool immediate = false, String? reason}) async {
    await _authorizedPost(
      '/subscriptions/cancel',
      data: {
        'immediate': immediate,
        if (reason != null) 'reason': reason,
      },
    );
  }

  Future<PaymentStatusResult> getPaymentStatus(String providerReference) async {
    final response = await _authorizedGet(
      '/payments/status',
      queryParameters: {'providerReference': providerReference},
    );

    return PaymentStatusResult.fromJson(_asMap(response.data));
  }

  String _planCode(MembershipPlan plan) {
    return switch (plan) {
      MembershipPlan.free => 'FREE',
      MembershipPlan.premium => 'PREMIUM',
      MembershipPlan.partner => 'PARTNER',
      MembershipPlan.unknown => 'FREE',
    };
  }

  Future<String> _resolvePlanCode(
    MembershipPlan plan, {
    String billingInterval = 'MONTHLY',
  }) async {
    final preferred = _planCode(plan).toUpperCase();
    try {
      final plans = _cachedPlans ?? await getPlans();
      final exact = plans.where((item) => item.code.toUpperCase() == preferred);
      if (exact.isNotEmpty) {
        return exact.first.code;
      }

      if (plan == MembershipPlan.premium || plan == MembershipPlan.partner) {
        final paidPlans = plans
            .where((item) => item.amount > 0)
            .where(
              (item) =>
                  item.billingInterval.toUpperCase() == billingInterval.toUpperCase(),
            )
            .toList();
        if (paidPlans.isNotEmpty) {
          return paidPlans.first.code;
        }
      }
    } catch (_) {
      // Fall back to hardcoded plan codes when plans cannot be loaded.
    }

    return preferred;
  }

  Future<Response<dynamic>> _authorizedGet(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.get<dynamic>(
      path,
      queryParameters: queryParameters,
      options: Options(
        headers: {'Authorization': 'Bearer ${accessToken ?? ''}'},
      ),
    );
  }

  Future<Response<dynamic>> _authorizedPost(
    String path, {
    Object? data,
  }) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.post<dynamic>(
      path,
      data: data,
      options: Options(
        headers: {'Authorization': 'Bearer ${accessToken ?? ''}'},
      ),
    );
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return <String, dynamic>{};
  }
}
