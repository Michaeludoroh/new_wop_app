import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';
import 'models/clip_models.dart';

class ClipService {
  ClipService({
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

  static const _favoritesKey = 'favorite_clip_ids';

  final Dio _dio;
  final TokenStorageService _tokenStorageService;

  Future<ClipListResponse> getClips({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _authorizedGet(
      '/clips/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        'limit': limit,
        'offset': offset,
      },
    );

    return ClipListResponse.fromJson(_asMap(response.data));
  }

  Future<ClipListResponse> getFeaturedClips({int limit = 10}) async {
    final response = await _authorizedGet(
      '/clips/public/featured',
      queryParameters: {'limit': limit},
    );

    return ClipListResponse.fromJson(_asMap(response.data));
  }

  Future<ClipDetailsResponse> getClipDetails(String id) async {
    final response = await _authorizedGet('/clips/public/$id');
    return ClipDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<Set<String>> getFavoriteIds() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_favoritesKey) ?? const <String>[]).toSet();
  }

  Future<Set<String>> toggleFavorite(String clipId) async {
    final prefs = await SharedPreferences.getInstance();
    final favorites = (prefs.getStringList(_favoritesKey) ?? const <String>[]).toSet();
    if (!favorites.add(clipId)) {
      favorites.remove(clipId);
    }
    await prefs.setStringList(_favoritesKey, favorites.toList()..sort());
    return favorites;
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
