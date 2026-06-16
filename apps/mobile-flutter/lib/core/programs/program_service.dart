import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/program_models.dart';

class ProgramService {
  ProgramService({
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

  Future<ProgramListResponse> getPrograms({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _authorizedGet(
      '/programs/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        'limit': limit,
        'offset': offset,
      },
    );

    return ProgramListResponse.fromJson(_asMap(response.data));
  }

  Future<ProgramListResponse> getFeaturedPrograms({int limit = 8}) async {
    final response = await _authorizedGet(
      '/programs/public/featured',
      queryParameters: {'limit': limit},
    );

    return ProgramListResponse.fromJson(_asMap(response.data));
  }

  Future<ProgramDetailsResponse> getProgramDetails(String slugOrId) async {
    final response = await _authorizedGet('/programs/public/$slugOrId');
    return ProgramDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<ProgramEnrollmentResponse> enroll(String programId) async {
    final response = await _authorizedPost('/programs/$programId/enroll');
    return ProgramEnrollmentResponse.fromJson(_asMap(response.data));
  }

  Future<void> cancelEnrollment(String programId) async {
    await _authorizedDelete('/programs/$programId/enroll');
  }

  Future<ProgramProgressItem> getProgress(String programId) async {
    final response = await _authorizedGet('/programs/me/$programId/progress');
    return ProgramProgressItem.fromJson(_asMap(response.data));
  }

  Future<ProgramProgressItem> updateProgress(
    String programId, {
    double? completionPct,
    String? currentModule,
    String? notes,
  }) async {
    final response = await _authorizedPatch(
      '/programs/me/$programId/progress',
      data: {
        if (completionPct != null) 'completionPct': completionPct,
        if (currentModule != null) 'currentModule': currentModule,
        if (notes != null) 'notes': notes,
      },
    );
    return ProgramProgressItem.fromJson(_asMap(response.data));
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

  Future<Response<dynamic>> _authorizedPost(String path) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.post<dynamic>(
      path,
      options: Options(headers: {'Authorization': 'Bearer ${accessToken ?? ''}'}),
    );
  }

  Future<Response<dynamic>> _authorizedPatch(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.patch<dynamic>(
      path,
      data: data,
      options: Options(headers: {'Authorization': 'Bearer ${accessToken ?? ''}'}),
    );
  }

  Future<Response<dynamic>> _authorizedDelete(String path) async {
    final accessToken = await _tokenStorageService.getAccessToken();
    return _dio.delete<dynamic>(
      path,
      options: Options(headers: {'Authorization': 'Bearer ${accessToken ?? ''}'}),
    );
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }
}
