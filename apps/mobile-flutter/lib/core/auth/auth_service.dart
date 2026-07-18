import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
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

/// TEMP: Remove after auth connectivity diagnosis.
class _AuthDebugInterceptor extends Interceptor {
  String _fullUrl(RequestOptions options) {
    final base = options.baseUrl;
    final path = options.path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    final normalizedBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return '$normalizedBase$normalizedPath';
  }

  Map<String, dynamic> _safeHeaders(Map<String, dynamic> headers) {
    final copy = Map<String, dynamic>.from(headers);
    final auth = copy['Authorization'] ?? copy['authorization'];
    if (auth is String && auth.isNotEmpty) {
      copy['Authorization'] = auth.length > 20
          ? '${auth.substring(0, 20)}…(redacted)'
          : '(redacted)';
      copy.remove('authorization');
    }
    return copy;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('[AUTH] ========== REQUEST ==========');
    debugPrint('[AUTH] METHOD: ${options.method}');
    debugPrint('[AUTH] FULL URL: ${_fullUrl(options)}');
    debugPrint('[AUTH] HEADERS: ${_safeHeaders(options.headers)}');
    debugPrint('[AUTH] baseUrl=${options.baseUrl} path=${options.path}');
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    debugPrint('[AUTH] ========== RESPONSE ==========');
    debugPrint('[AUTH] STATUS CODE: ${response.statusCode}');
    debugPrint('[AUTH] BODY: ${response.data}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('[AUTH] ========== NO RESPONSE / ERROR ==========');
    debugPrint('[AUTH] FULL URL: ${_fullUrl(err.requestOptions)}');
    debugPrint('[AUTH] TYPE: ${err.type}');
    debugPrint('[AUTH] MESSAGE: ${err.message}');
    if (err.response != null) {
      debugPrint('[AUTH] STATUS CODE: ${err.response?.statusCode}');
      debugPrint('[AUTH] BODY: ${err.response?.data}');
    } else {
      debugPrint('[AUTH] DioException (complete): $err');
      debugPrint('[AUTH] error: ${err.error}');
    }
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
    // TEMP: Remove after auth connectivity diagnosis.
    if (dio == null) {
      _dio.interceptors.add(_AuthDebugInterceptor());
      debugPrint('[AUTH] ApiConfig.apiBaseUrl => ${AuthApiConfig.baseUrl}');
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
    AppLog.debug('REGISTER REQUEST: ${request.toJson()}');

    final response = await _dio.post<dynamic>(
      AuthApiConfig.registerPath,
      data: request.toJson(),
    );

    AppLog.debug('REGISTER RESPONSE: ${response.data}');

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
    await _dio.post<dynamic>(
      AuthApiConfig.forgotPasswordPath,
      data: request.toJson(),
    );
  }

  Future<void> resetPassword(ResetPasswordRequest request) async {
    await _dio.post<dynamic>(
      AuthApiConfig.resetPasswordPath,
      data: request.toJson(),
    );
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
}
