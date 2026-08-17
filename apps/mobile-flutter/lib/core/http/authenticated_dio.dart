import 'package:dio/dio.dart';

import '../auth/auth_service.dart';
import '../auth/token_storage_service.dart';

class AuthenticatedDio {
  AuthenticatedDio({
    Dio? dio,
    AuthService? authService,
    TokenStorageService? tokenStorageService,
  })  : _authService = authService ?? AuthService(),
        _tokenStorageService = tokenStorageService ?? TokenStorageService(),
        dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AuthApiConfig.baseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                sendTimeout: const Duration(seconds: 20),
                headers: {'Content-Type': 'application/json'},
              ),
            ) {
    this.dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) async {
              final token = await _tokenStorageService.getAccessToken();
              if (token != null && token.isNotEmpty) {
                options.headers['Authorization'] = 'Bearer $token';
              } else {
                options.headers.remove('Authorization');
              }
              handler.next(options);
            },
            onError: (error, handler) async {
              final statusCode = error.response?.statusCode;
              final retried = error.requestOptions.extra['_retried'] == true;
              if (statusCode != 401 || retried) {
                handler.next(error);
                return;
              }

              try {
                await _authService.refresh();
                final retryOptions = error.requestOptions;
                retryOptions.extra['_retried'] = true;
                final token = await _tokenStorageService.getAccessToken();
                if (token != null && token.isNotEmpty) {
                  retryOptions.headers['Authorization'] = 'Bearer $token';
                } else {
                  retryOptions.headers.remove('Authorization');
                }
                final response = await this.dio.fetch<dynamic>(retryOptions);
                handler.resolve(response);
              } catch (_) {
                await _tokenStorageService.clearTokens();
                handler.next(error);
              }
            },
          ),
        );
  }

  final Dio dio;
  final AuthService _authService;
  final TokenStorageService _tokenStorageService;
}
