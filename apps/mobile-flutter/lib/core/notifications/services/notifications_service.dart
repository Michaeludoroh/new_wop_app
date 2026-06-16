import 'package:dio/dio.dart';

import '../../auth/auth_service.dart';
import '../../auth/token_storage_service.dart';
import '../models/notification_model.dart';

class NotificationsApiConfig {
  static const String notificationsPath = '/notifications';
}

class NotificationServiceException implements Exception {
  NotificationServiceException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class NotificationsService {
  NotificationsService({
    Dio? dio,
    AuthService? authService,
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
        _authService = authService ?? AuthService(),
        _tokenStorageService = tokenStorageService ?? TokenStorageService();

  final Dio _dio;
  final AuthService _authService;
  final TokenStorageService _tokenStorageService;

  Future<NotificationPageResult> fetchNotifications({
    int page = 1,
    int limit = 20,
    String? readState,
  }) async {
    final data = await _authorizedRequest<Map<String, dynamic>>(
      () async {
        final response = await _dio.get<dynamic>(
          NotificationsApiConfig.notificationsPath,
          queryParameters: {
            'offset': (page - 1) * limit,
            'limit': limit,
            if (readState != null && readState.isNotEmpty)
              'isRead': readState.toUpperCase() == 'READ',
          },
          options: await _authOptions(),
        );
        return _asMap(response.data);
      },
    );

    return NotificationPageResult.fromJson(data);
  }

  Future<AppNotification> fetchNotificationById(String id) async {
    final data = await _authorizedRequest<Map<String, dynamic>>(
      () async {
        final response = await _dio.get<dynamic>(
          '${NotificationsApiConfig.notificationsPath}/$id',
          options: await _authOptions(),
        );
        final map = _asMap(response.data);
        if (map['data'] is Map<String, dynamic>) {
          return map['data'] as Map<String, dynamic>;
        }
        return map;
      },
    );

    return AppNotification.fromJson(data);
  }

  Future<AppNotification> markReadState({
    required String id,
    required bool read,
  }) async {
    final data = await _authorizedRequest<Map<String, dynamic>>(
      () async {
        final response = await _dio.patch<dynamic>(
          '${NotificationsApiConfig.notificationsPath}/$id/read-state',
          data: {'isRead': read},
          options: await _authOptions(),
        );
        final map = _asMap(response.data);
        if (map['data'] is Map<String, dynamic>) {
          return map['data'] as Map<String, dynamic>;
        }
        return map;
      },
    );

    return AppNotification.fromJson(data);
  }

  Future<T> _authorizedRequest<T>(Future<T> Function() fn) async {
    try {
      return await fn();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        try {
          await _authService.refresh();
          return await fn();
        } on DioException catch (refreshRetryError) {
          if (refreshRetryError.response?.statusCode == 401) {
            await _tokenStorageService.clearTokens();
          }
          throw _toServiceException(refreshRetryError);
        } catch (_) {
          await _tokenStorageService.clearTokens();
          rethrow;
        }
      }
      throw _toServiceException(e);
    }
  }

  Future<Options> _authOptions() async {
    final accessToken = await _tokenStorageService.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw NotificationServiceException('Unauthorized session',
          statusCode: 401);
    }

    return Options(headers: {'Authorization': 'Bearer $accessToken'});
  }

  NotificationServiceException _toServiceException(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;
    String message = 'Notification request failed';

    if (data is Map<String, dynamic>) {
      final raw = data['message'];
      if (raw is String && raw.isNotEmpty) {
        message = raw;
      } else if (raw is List && raw.isNotEmpty) {
        message = raw.join(', ');
      }
    }

    if (status == 401) {
      message = 'Session expired. Please sign in again.';
    }

    return NotificationServiceException(message, statusCode: status);
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return <String, dynamic>{};
  }
}
