import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import 'models/clip_models.dart';

class ClipService {
  ClipService({AuthenticatedDio? authenticatedDio})
      : _dio = (authenticatedDio ?? AuthenticatedDio()).dio;

  final Dio _dio;

  Future<ClipListResponse> getClips({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _dio.get<dynamic>(
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
    final response = await _dio.get<dynamic>(
      '/clips/public/featured',
      queryParameters: {'limit': limit},
    );

    return ClipListResponse.fromJson(_asMap(response.data));
  }

  Future<ClipDetailsResponse> getClipDetails(String id) async {
    final response = await _dio.get<dynamic>('/clips/public/$id');
    return ClipDetailsResponse.fromJson(_asMap(response.data));
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
