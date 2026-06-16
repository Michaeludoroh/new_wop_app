import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/announcement_models.dart';

class AnnouncementService {
  AnnouncementService({
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

  Future<AnnouncementListResponse> getAnnouncements({
    String? search,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _authorizedGet(
      '/announcements/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        'page': page,
        'limit': limit,
      },
    );

    return AnnouncementListResponse.fromJson(_asMap(response.data));
  }

  Future<AnnouncementDetailsResponse> getAnnouncementDetails(String id) async {
    final response = await _authorizedGet('/announcements/public/$id');
    return AnnouncementDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<List<AnnouncementCategoryOption>> getCategories() async {
    final response = await _authorizedGet('/announcements/public/categories');
    final map = _asMap(response.data);
    final data = map['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((item) => AnnouncementCategoryOption.fromJson(item.cast<String, dynamic>()))
        .toList();
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

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
    return <String, dynamic>{};
  }
}
