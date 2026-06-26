import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import 'models/policy_models.dart';
import 'policy_acceptance_diagnostics.dart';

class PolicyService {
  PolicyService({AuthenticatedDio? authenticatedDio})
      : _dio = (authenticatedDio ?? AuthenticatedDio()).dio;

  final Dio _dio;

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
    PolicyAcceptanceDiagnostics.statusFetchCount += 1;
    final response = await _authorizedGet('/policies/me/status');
    final status = PolicyAcceptanceStatus.fromJson(_asMap(response.data));
    PolicyAcceptanceDiagnostics.log(
      'PolicyService.getAcceptanceStatus fetch#${PolicyAcceptanceDiagnostics.statusFetchCount} requiresAction=${status.requiresAction} pending=${status.pending.length}',
    );
    return status;
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
  }) {
    return _dio.get<dynamic>(path, queryParameters: queryParameters);
  }

  Future<Response<dynamic>> _authorizedPost(
    String path, {
    Map<String, dynamic>? data,
  }) {
    return _dio.post<dynamic>(path, data: data);
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
    return <String, dynamic>{};
  }
}
