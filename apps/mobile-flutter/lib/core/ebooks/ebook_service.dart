import 'package:dio/dio.dart';

import '../http/authenticated_dio.dart';
import '../subscriptions/subscription_service.dart';
import 'models/ebook_models.dart';

class EbookService {
  EbookService({
    AuthenticatedDio? authenticatedDio,
    SubscriptionService? subscriptionService,
  })  : _dio = (authenticatedDio ?? AuthenticatedDio()).dio,
        _subscriptionService = subscriptionService ?? SubscriptionService();

  final Dio _dio;
  final SubscriptionService _subscriptionService;

  Future<EbookListResponse> getEbooks({
    String? search,
    String? category,
    bool? featured,
    bool? recent,
  }) async {
    final response = await _authorizedGet(
      '/ebooks',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': '$featured',
        if (recent != null) 'recent': '$recent',
      },
    );

    return EbookListResponse.fromJson(_asMap(response.data));
  }

  Future<EbookDetailsResponse> getEbookDetails(String id) async {
    final response = await _authorizedGet('/ebooks/$id');
    return EbookDetailsResponse.fromJson(_asMap(response.data));
  }

  Future<LibraryResponse> getMyLibrary() async {
    final response = await _authorizedGet('/library');
    return LibraryResponse.fromJson(_asMap(response.data));
  }

  Future<RecentlyReadResponse> getRecentlyRead({int limit = 10}) async {
    final response = await _authorizedGet(
      '/ebooks/recently-read',
      queryParameters: {'limit': '$limit'},
    );
    return RecentlyReadResponse.fromJson(_asMap(response.data));
  }

  Future<ReadingProgressResponse> getReadingProgress(String ebookId) async {
    final response = await _authorizedGet('/ebooks/$ebookId/progress');
    return ReadingProgressResponse.fromJson(_asMap(response.data));
  }

  Future<AccessResponse> getAccess(String ebookId) async {
    final response = await _authorizedGet('/ebooks/$ebookId/access');
    final access = AccessResponse.fromJson(_asMap(response.data));
    if (access.authorized &&
        access.streamToken != null &&
        access.streamToken!.isNotEmpty) {
      await _subscriptionService.validateContentAccess(
        token: access.streamToken!,
        resourceType: 'ebook',
        resourceId: ebookId,
      );
    }

    return access;
  }

  Future<ReadingProgressResponse> updateReadingProgress({
    required String ebookId,
    required int currentPage,
    int? totalPages,
    double? progressPct,
    List<int>? bookmarkPages,
    bool? downloaded,
  }) async {
    final response = await _authorizedPost(
      '/ebooks/$ebookId/progress',
      data: {
        'currentPage': currentPage,
        if (totalPages != null) 'totalPages': totalPages,
        if (progressPct != null) 'progressPct': progressPct,
        if (bookmarkPages != null) 'bookmarkPages': bookmarkPages,
        if (downloaded != null) 'downloaded': downloaded,
      },
    );
    return ReadingProgressResponse.fromJson(_asMap(response.data));
  }

  Future<void> recordDownload(String ebookId) async {
    await _authorizedPost('/ebooks/$ebookId/download');
  }

  Future<Response<List<int>>> downloadPdfBytes(String contentUrl) async {
    return _dio.get<List<int>>(
      contentUrl,
      options: Options(
        responseType: ResponseType.bytes,
      ),
    );
  }

  Future<Response<dynamic>> _authorizedGet(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.get<dynamic>(
      path,
      queryParameters: queryParameters,
    );
  }

  Future<Response<dynamic>> _authorizedPost(
    String path, {
    Object? data,
  }) async {
    return _dio.post<dynamic>(
      path,
      data: data,
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
