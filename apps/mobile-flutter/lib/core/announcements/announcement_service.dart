import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import 'models/announcement_models.dart';

class AnnouncementService {
  AnnouncementService({AuthenticatedDio? authenticatedDio})
      : _dio = (authenticatedDio ?? AuthenticatedDio()).dio;

  final Dio _dio;

  Future<AnnouncementListResponse> getAnnouncements({
    String? search,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get<dynamic>(
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
    final response = await _dio.get<dynamic>('/announcements/public/$id');
    return AnnouncementDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<List<AnnouncementCategoryOption>> getCategories() async {
    final response = await _dio.get<dynamic>('/announcements/public/categories');
    final map = _asMap(response.data);
    final data = map['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((item) => AnnouncementCategoryOption.fromJson(item.cast<String, dynamic>()))
        .toList();
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.map((k, v) => MapEntry(k.toString(), v));
    return <String, dynamic>{};
  }
}
