import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/event_models.dart';

class EventService {
  EventService({
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

  Future<EventListResponse> getEvents({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _authorizedGet(
      '/events/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        'limit': limit,
        'offset': offset,
      },
    );

    return EventListResponse.fromJson(_asMap(response.data));
  }

  Future<EventListResponse> getFeaturedEvents({int limit = 8}) async {
    final response = await _authorizedGet(
      '/events/public/featured',
      queryParameters: {'limit': limit},
    );

    return EventListResponse.fromJson(_asMap(response.data));
  }

  Future<EventDetailsResponse> getEventDetails(String slugOrId) async {
    final response = await _authorizedGet('/events/public/$slugOrId');
    return EventDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<EventRsvpResponse> rsvp(String eventId) async {
    final response = await _authorizedPost('/events/$eventId/rsvp');
    return EventRsvpResponse.fromJson(_asMap(response.data));
  }

  Future<void> cancelRsvp(String eventId) async {
    await _authorizedDelete('/events/$eventId/rsvp');
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
