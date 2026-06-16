import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/mentorship_models.dart';

class MentorshipService {
  MentorshipService({
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

  Future<MentorshipListResponse> getClasses({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _authorizedGet(
      '/mentorship/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        'limit': limit,
        'offset': offset,
      },
    );
    return MentorshipListResponse.fromJson(_asMap(response.data));
  }

  Future<MentorshipListResponse> getFeaturedClasses({int limit = 8}) async {
    final response = await _authorizedGet(
      '/mentorship/public/featured',
      queryParameters: {'limit': limit},
    );
    return MentorshipListResponse.fromJson(_asMap(response.data));
  }

  Future<MentorshipDetailsResponse> getClassDetails(String slugOrId) async {
    final response = await _authorizedGet('/mentorship/public/$slugOrId');
    return MentorshipDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<List<MentorshipSessionItem>> getSessions(String slugOrId) async {
    final response = await _authorizedGet('/mentorship/public/$slugOrId/sessions');
    final map = _asMap(response.data);
    final items = map['data'] is List ? map['data'] as List : const [];
    return items
        .whereType<Map>()
        .map((item) => MentorshipSessionItem.fromJson(item.map((k, v) => MapEntry(k.toString(), v))))
        .toList();
  }

  Future<MentorshipEnrollmentResponse> enroll(String classId) async {
    final response = await _authorizedPost('/mentorship/$classId/enroll');
    return MentorshipEnrollmentResponse.fromJson(_asMap(response.data));
  }

  Future<void> cancelEnrollment(String classId) async {
    await _authorizedDelete('/mentorship/$classId/enroll');
  }

  Future<MentorshipProgressItem> getProgress(String classId) async {
    final response = await _authorizedGet('/mentorship/me/$classId/progress');
    return MentorshipProgressItem.fromJson(_asMap(response.data));
  }

  Future<MentorshipProgressItem> updateProgress(
    String classId, {
    double? completionPct,
    String? currentMilestone,
    String? notes,
  }) async {
    final response = await _authorizedPatch(
      '/mentorship/me/$classId/progress',
      data: {
        if (completionPct != null) 'completionPct': completionPct,
        if (currentMilestone != null) 'currentMilestone': currentMilestone,
        if (notes != null) 'notes': notes,
      },
    );
    return MentorshipProgressItem.fromJson(_asMap(response.data));
  }

  Future<List<MentorshipAttendanceItem>> getAttendance(String classId) async {
    final response = await _authorizedGet('/mentorship/me/$classId/attendance');
    final map = _asMap(response.data);
    final items = map['data'] is List ? map['data'] as List : const [];
    return items
        .whereType<Map>()
        .map((item) => MentorshipAttendanceItem.fromJson(item.map((k, v) => MapEntry(k.toString(), v))))
        .toList();
  }

  Future<void> submitFeedback(String classId, {required int rating, String? comment}) async {
    await _authorizedPost(
      '/mentorship/me/$classId/feedback',
      data: {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
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
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((key, val) => MapEntry(key.toString(), val));
    return <String, dynamic>{};
  }
}
