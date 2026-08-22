import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';

class _MemoryTokenStorage extends TokenStorageService {
  String? accessToken;
  String? refreshToken;
  DateTime? expiry;
  String? rememberedEmail;
  bool clearTokensCalled = false;

  @override
  Future<void> saveAccessToken(String token) async => accessToken = token;

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<void> saveRefreshToken(String token) async => refreshToken = token;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<void> saveTokenExpiry(DateTime value) async => expiry = value;

  @override
  Future<DateTime?> getTokenExpiry() async => expiry;

  @override
  Future<void> clearTokenExpiry() async => expiry = null;

  @override
  Future<void> saveRememberedEmail(String email) async => rememberedEmail = email;

  @override
  Future<String?> getRememberedEmail() async => rememberedEmail;

  @override
  Future<void> clearRememberedEmail() async => rememberedEmail = null;

  @override
  Future<void> clearTokens() async {
    clearTokensCalled = true;
    accessToken = null;
    refreshToken = null;
    expiry = null;
  }
}

class _FakeAuthService extends AuthService {
  _FakeAuthService({
    required this.storage,
    this.throwOnLogin,
  }) : super(tokenStorageService: storage);

  final TokenStorageService storage;
  Object? throwOnLogin;

  @override
  Future<AuthSession> login(LoginRequest request) async {
    if (throwOnLogin != null) {
      throw throwOnLogin!;
    }
    final tokens = AuthTokens(
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
    );
    await storage.saveAccessToken(tokens.accessToken);
    await storage.saveRefreshToken(tokens.refreshToken);
    return AuthSession(
      user: AuthUser(
        id: 'user-1',
        email: request.email,
        name: 'Ada',
        role: 'member',
      ),
      tokens: tokens,
    );
  }

  @override
  Future<AuthSession> register(RegisterRequest request) {
    throw UnimplementedError();
  }

  @override
  Future<AuthTokens> refresh() {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {
    await storage.clearTokens();
  }

  @override
  Future<AuthUser> me() async {
    return AuthUser(
      id: 'user-1',
      email: 'user@example.com',
      name: 'Ada',
      role: 'member',
    );
  }

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {}

  @override
  Future<void> resetPassword(ResetPasswordRequest request) async {}
}

void main() {
  group('AuthProvider login/session/logout', () {
    test('successful login authenticates without storing a password', () async {
      final storage = _MemoryTokenStorage();
      final provider = AuthProvider(
        authService: _FakeAuthService(storage: storage),
        tokenStorageService: storage,
      );

      await provider.login(
        LoginRequest(email: 'user@example.com', password: 'secret-pass'),
      );
      await provider.persistRememberedEmail('user@example.com');

      expect(provider.state.status, AuthStatus.authenticated);
      expect(provider.state.user?.email, 'user@example.com');
      expect(storage.rememberedEmail, 'user@example.com');
      expect(storage.accessToken, 'access-token');
      expect(storage.refreshToken, 'refresh-token');
    });

    test('failed login stays unauthenticated with a safe error', () async {
      final storage = _MemoryTokenStorage();
      final provider = AuthProvider(
        authService: _FakeAuthService(
          storage: storage,
          throwOnLogin: DioException(
            requestOptions: RequestOptions(path: '/auth/login'),
            type: DioExceptionType.badResponse,
            response: Response<dynamic>(
              requestOptions: RequestOptions(path: '/auth/login'),
              statusCode: 401,
              data: {'message': 'Unauthorized'},
            ),
          ),
        ),
        tokenStorageService: storage,
      );

      await expectLater(
        provider.login(
          LoginRequest(email: 'user@example.com', password: 'wrong-pass'),
        ),
        throwsA(isA<DioException>()),
      );

      expect(provider.state.status, AuthStatus.unauthenticated);
      expect(provider.state.errorMessage, isNot(contains('wrong-pass')));
      expect(provider.state.errorMessage, isNot(contains('Bearer')));
      expect(storage.accessToken, isNull);
    });

    test('logout clears tokens and keeps remembered email', () async {
      final storage = _MemoryTokenStorage()
        ..accessToken = 'access-token'
        ..refreshToken = 'refresh-token'
        ..rememberedEmail = 'user@example.com';
      final provider = AuthProvider(
        authService: _FakeAuthService(storage: storage),
        tokenStorageService: storage,
      );

      await provider.persistRememberedEmail('user@example.com');
      await provider.logout();

      expect(provider.state.status, AuthStatus.unauthenticated);
      expect(storage.clearTokensCalled, isTrue);
      expect(storage.accessToken, isNull);
      expect(storage.refreshToken, isNull);
      expect(storage.rememberedEmail, 'user@example.com');
      expect(await provider.rememberedEmail(), 'user@example.com');
    });

    test('clearing remembered email does not store a password key', () async {
      final storage = _MemoryTokenStorage()..rememberedEmail = 'user@example.com';
      final provider = AuthProvider(
        authService: _FakeAuthService(storage: storage),
        tokenStorageService: storage,
      );

      await provider.persistRememberedEmail(null);

      expect(storage.rememberedEmail, isNull);
    });
  });
}
