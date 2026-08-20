import 'package:dio/dio.dart';

import '../http/api_error.dart';
import '../http/authenticated_dio.dart';
import '../http/public_asset_url.dart';
import '../logging/app_log.dart';
import 'models/clip_models.dart';

class ClipServiceException implements Exception {
  ClipServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}

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
    return _getList(
      '/clips/public',
      queryParameters: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (featured != null) 'featured': featured,
        'limit': limit,
        'offset': offset,
      },
    );
  }

  Future<ClipListResponse> getFeaturedClips({int limit = 10}) async {
    return _getList(
      '/clips/public/featured',
      queryParameters: {'limit': limit},
    );
  }

  Future<ClipDetailsResponse> getClipDetails(String id) async {
    try {
      final response = await _dio.get<dynamic>('/clips/public/$id');
      return ClipDetailsResponse.fromJson(_asMap(response.data));
    } catch (error) {
      AppLog.debug(
        'Clip details failed: id=$id status=${_statusOf(error)} type=${_typeOf(error)}',
      );
      throw ClipServiceException(
        messageFromDio(error, fallback: 'Failed to load clip.'),
      );
    }
  }

  Future<void> assertVideoReachable(String videoUrl) async {
    final url = rewritePublicAssetUrl(videoUrl);
    if (url.isEmpty || !isPlayableNetworkUrl(url)) {
      throw ClipServiceException('This clip does not have a valid video URL.');
    }
    try {
      await _dio.head<void>(
        url,
        options: Options(
          followRedirects: true,
          validateStatus: (status) => status != null && status < 400,
          receiveTimeout: const Duration(seconds: 15),
        ),
      );
    } catch (error) {
      final status = apiHttpStatus(error);
      if (status == 405 || status == 501) {
        return;
      }
      throw ClipServiceException(
        messageFromDio(error, fallback: 'This clip video is not available.'),
      );
    }
  }

  Future<ClipListResponse> _getList(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<dynamic>(
        path,
        queryParameters: queryParameters,
      );
      final parsed = ClipListResponse.fromJson(_asMap(response.data));
      AppLog.debug(
        'Clips loaded: path=$path count=${parsed.data.length} total=${parsed.total}',
      );
      return parsed;
    } catch (error) {
      AppLog.debug(
        'Clips request failed: path=$path status=${_statusOf(error)} type=${_typeOf(error)}',
      );
      throw ClipServiceException(
        messageFromDio(error, fallback: 'Failed to load clips.'),
      );
    }
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    if (value is List) {
      return <String, dynamic>{'data': value, 'total': value.length};
    }
    return <String, dynamic>{};
  }

  String _statusOf(Object error) {
    if (error is DioException) {
      return '${error.response?.statusCode ?? 'none'}';
    }
    return 'n/a';
  }

  String _typeOf(Object error) {
    if (error is DioException) {
      return error.type.name;
    }
    return error.runtimeType.toString();
  }
}
