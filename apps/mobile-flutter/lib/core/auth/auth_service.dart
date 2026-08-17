import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import '../http/api_error.dart';
import '../logging/app_log.dart';
import 'models/auth_models.dart';
import 'token_storage_service.dart';

class AuthApiConfig {
  static String get baseUrl => ApiConfig.apiBaseUrl;

  static const String loginPath = '/auth/login';
  static const String registerPath = '/auth/register';
  static const String refreshPath = '/auth/refresh';
  static const String logoutPath = '/auth/logout';
  static const String mePath = '/auth/me';
  static const String forgotPasswordPath = '/auth/forgot-password';
  static const String resetPasswordPath = '/auth/reset-password';
  static const String sendVerificationEmailPath = '/auth/send-verification-email';
  static const String resendVerificationPath = '/auth/resend-verification';
}

/// Debug-only auth traffic logger. Never logs bodies, tokens, passwords, or Authorization.
class _AuthDebugInterceptor extends Interceptor {
  String _safePath(RequestOptions options) {
    final path = options.path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        return Uri.parse(path).replace(query: '', fragment: '').toString();
      } catch (_) {
        return path.split('?').first;
      }
    }
    return path.split('?').first;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    AppLog.debug('[AUTH] ${options.method} ${_safePath(options)}');
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    AppLog.debug(
      '[AUTH] ${response.requestOptions.method} ${_safePath(response.requestOptions)} -> ${response.statusCode}',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    AppLog.debug(
      '[AUTH] ${err.requestOptions.method} ${_safePath(err.requestOptions)} error type=${err.type} status=${err.response?.statusCode}',
    );
    handler.next(err);
  }
}

class AuthService {
  AuthService({
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
        _tokenStorageService = tokenStorageService ?? TokenStorageService() {
    if (dio == null && kDebugMode) {
      _dio.interceptors.add(_AuthDebugInterceptor());
    }
  }

  final Dio _dio;
  final TokenStorageService _tokenStorageService;

  Future<AuthSession> login(LoginRequest request) async {
    final response = await _dio.post<dynamic>(
      AuthApiConfig.loginPath,
      data: request.toJson(),
    );

    final session = _parseSession(response.data);
    await _persistTokens(session.tokens);
    return session;
  }

  Future<AuthSession> register(RegisterRequest request) async {
    final response = await _dio.post<dynamic>(
      AuthApiConfig.registerPath,
      data: request.toJson(),
    );

    final session = _parseSession(response.data);
    await _persistTokens(session.tokens);
    return session;
  }

  Future<AuthTokens> refresh() async {
    final refreshToken = await _tokenStorageService.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw StateError('No refresh token available');
    }

    final response = await _dio.post<dynamic>(
      AuthApiConfig.refreshPath,
      data: {'refreshToken': refreshToken},
    );

    final data = _asMap(response.data);
    final tokens = _extractTokens(data);

    await _persistTokens(tokens);
    return tokens;
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorageService.getRefreshToken();

    try {
      await _dio.post<dynamic>(
        AuthApiConfig.logoutPath,
        data: {
          if (refreshToken != null && refreshToken.isNotEmpty)
            'refreshToken': refreshToken,
        },
      );
    } finally {
      await _tokenStorageService.clearTokens();
    }
  }

  Future<AuthUser> me() async {
    final accessToken = await _tokenStorageService.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw StateError('No access token available');
    }

    final response = await _dio.get<dynamic>(
      AuthApiConfig.mePath,
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );

    final data = _asMap(response.data);
    final userJson = (data['user'] is Map<String, dynamic>)
        ? data['user'] as Map<String, dynamic>
        : data;

    return AuthUser.fromJson(userJson);
  }

  Future<void> forgotPassword(ForgotPasswordRequest request) async {
    try {
      await _dio.post<dynamic>(
        AuthApiConfig.forgotPasswordPath,
        data: request.toJson(),
      );
    } catch (error) {
      AppLog.debug(
        'Forgot password request failed: status=${_statusOf(error)} type=${_typeOf(error)}',
      );
      throw Exception(
        messageFromDio(
          error,
          fallback: 'Failed to request password reset. Please try again.',
        ),
      );
    }
  }

  Future<void> resetPassword(ResetPasswordRequest request) async {
    try {
      await _dio.post<dynamic>(
        AuthApiConfig.resetPasswordPath,
        data: request.toJson(),
      );
    } catch (error) {
      AppLog.debug(
        'Reset password request failed: status=${_statusOf(error)} type=${_typeOf(error)}',
      );
      throw Exception(
        messageFromDio(
          error,
          fallback: 'Failed to reset password. Please try again.',
        ),
      );
    }
  }

  Future<void> resendVerificationEmail() async {
    final accessToken = await _tokenStorageService.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw StateError('No access token available');
    }

    await _dio.post<dynamic>(
      AuthApiConfig.resendVerificationPath,
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
  }

  Future<void> sendVerificationEmail() async {
    final accessToken = await _tokenStorageService.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) {
      throw StateError('No access token available');
    }

    await _dio.post<dynamic>(
      AuthApiConfig.sendVerificationEmailPath,
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
  }

  Future<void> _persistTokens(AuthTokens tokens) async {
    await _tokenStorageService.saveAccessToken(tokens.accessToken);
    await _tokenStorageService.saveRefreshToken(tokens.refreshToken);
    if (tokens.expiresAt != null) {
      await _tokenStorageService.saveTokenExpiry(tokens.expiresAt!);
    } else {
      await _tokenStorageService.clearTokenExpiry();
    }
  }

  AuthSession _parseSession(dynamic responseData) {
    final data = _asMap(responseData);

    if (data['user'] != null && data['tokens'] != null) {
      return AuthSession.fromJson(data);
    }

    final userJson = (data['user'] is Map<String, dynamic>)
        ? data['user'] as Map<String, dynamic>
        : <String, dynamic>{};

    final tokens = _extractTokens(data);

    return AuthSession(
      user: AuthUser.fromJson(userJson),
      tokens: tokens,
    );
  }

  AuthTokens _extractTokens(Map<String, dynamic> data) {
    if (data['tokens'] is Map<String, dynamic>) {
      return AuthTokens.fromJson(data['tokens'] as Map<String, dynamic>);
    }

    return AuthTokens.fromJson(data);
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map(
        (key, val) => MapEntry(key.toString(), val),
      );
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
