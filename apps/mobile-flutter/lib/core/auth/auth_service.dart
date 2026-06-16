import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'models/auth_models.dart';
import 'token_storage_service.dart';

class AuthApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static const String loginPath = '/auth/login';
  static const String registerPath = '/auth/register';
  static const String refreshPath = '/auth/refresh';
  static const String logoutPath = '/auth/logout';
  static const String mePath = '/auth/me';
  static const String forgotPasswordPath = '/auth/forgot-password';
  static const String resetPasswordPath = '/auth/reset-password';
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
        _tokenStorageService = tokenStorageService ?? TokenStorageService();

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
    debugPrint('REGISTER REQUEST: ${request.toJson()}');

    final response = await _dio.post<dynamic>(
      AuthApiConfig.registerPath,
      data: request.toJson(),
    );

    debugPrint('REGISTER RESPONSE: ${response.data}');

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
