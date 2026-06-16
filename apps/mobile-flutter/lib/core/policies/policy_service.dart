import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/policy_models.dart';

class PolicyService {
  PolicyService({
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

  Future<PolicyItem> getCurrentPolicy(String type) async {
    final response = await _publicGet('/policies/public/current/$type');
    return PolicyItem.fromJson(_asMap(response.data));
  }

  Future<List<PolicyTypeOption>> getPolicyTypes() async {
    final response = await _publicGet('/policies/public/types');
    final map = _asMap(response.data);
    final data = map['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((item) => PolicyTypeOption.fromJson(item.cast<String, dynamic>()))
        .toList();
  }

  Future<PolicyAcceptanceStatus> getAcceptanceStatus() async {
    final response = await _authorizedGet('/policies/me/status');
    return PolicyAcceptanceStatus.fromJson(_asMap(response.data));
  }

  Future<void> acceptPolicy(String policyId) async {
    await _authorizedPost('/policies/me/accept', data: {'policyId': policyId});
  }

  Future<Response<dynamic>> _publicGet(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) {
    return _dio.get<dynamic>(path, queryParameters: queryParameters);
  }

  Future<Response<dynamic>> _authorizedGet(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.get<dynamic>(
      path,
      queryParameters: queryParameters,
      options: Options(headers: {'Authorization': 'Bearer ${accessToken ?? ''}'}),
    );
  }

  Future<Response<dynamic>> _authorizedPost(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.post<dynamic>(
      path,
      data: data,
      options: Options(headers: {'Authorization': 'Bearer ${accessToken ?? ''}'}),
    );
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
    return <String, dynamic>{};
  }
}
