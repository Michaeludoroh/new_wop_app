import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';

class _FakeTokenStorageService extends TokenStorageService {
  _FakeTokenStorageService({
    this.accessToken,
    this.refreshToken,
    this.expiry,
  });

  String? accessToken;
  String? refreshToken;
  DateTime? expiry;
  bool clearTokensCalled = false;
  bool clearTokenExpiryCalled = false;

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<DateTime?> getTokenExpiry() async => expiry;

  @override
  Future<void> clearTokenExpiry() async {
    clearTokenExpiryCalled = true;
    expiry = null;
  }

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
    required TokenStorageService tokenStorageService,
    this.throwOnRefresh = false,
    this.returnRefreshWithoutExpiry = false,
  }) : super(tokenStorageService: tokenStorageService);

  final bool throwOnRefresh;
  final bool returnRefreshWithoutExpiry;

  int refreshCallCount = 0;
  int meCallCount = 0;

  @override
  Future<AuthTokens> refresh() async {
    refreshCallCount += 1;
    if (throwOnRefresh) {
      throw Exception('refresh failed');
    }

    return AuthTokens(
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: returnRefreshWithoutExpiry
          ? null
          : DateTime.now().toUtc().add(const Duration(hours: 1)),
    );
  }

  @override
  Future<AuthUser> me() async {
    meCallCount += 1;
    return AuthUser(
      id: 'user-1',
      email: 'user@example.com',
      name: 'Refresh User',
      role: 'member',
    );
  }

  @override
  Future<AuthSession> login(LoginRequest request) {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession> register(RegisterRequest request) {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {}

  @override
  Future<void> resetPassword(ResetPasswordRequest request) async {}
}

void main() {
  group('AuthProvider token refresh + expiration handling', () {
    test('ensureValidSession does not refresh when expiry is far in future',
        () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'valid-token',
        expiry: DateTime.now().toUtc().add(const Duration(minutes: 15)),
      );
      final authService = _FakeAuthService(tokenStorageService: storage);
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();
      await provider.ensureValidSession();

      expect(authService.refreshCallCount, 0);
      expect(authService.meCallCount, 1);
      expect(provider.state.status, AuthStatus.authenticated);
      expect(storage.clearTokensCalled, isFalse);
    });

    test('ensureValidSession refreshes when token is near expiry', () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'soon-expiring-token',
        refreshToken: 'refresh-token',
        expiry: DateTime.now().toUtc().add(const Duration(seconds: 30)),
      );
      final authService = _FakeAuthService(tokenStorageService: storage);
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();
      await provider.ensureValidSession();

      expect(authService.refreshCallCount, 1);
      expect(authService.meCallCount, 2);
      expect(provider.state.status, AuthStatus.authenticated);
      expect(storage.clearTokensCalled, isFalse);
    });

    test(
        'ensureValidSession clears tokens and unauthenticates on refresh failure',
        () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiry: DateTime.now().toUtc().subtract(const Duration(minutes: 1)),
      );
      final authService = _FakeAuthService(
        tokenStorageService: storage,
        throwOnRefresh: true,
      );
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();

      expect(provider.state.status, AuthStatus.unauthenticated);
      expect(storage.clearTokensCalled, isTrue);
    });

    test(
        'refresh token persistence clears stale expiry when expiresAt is absent',
        () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiry: DateTime.now().toUtc().add(const Duration(minutes: 20)),
      );
      final authService = _FakeAuthService(
        tokenStorageService: storage,
        returnRefreshWithoutExpiry: true,
      );

      final tokens = await authService.refresh();

      expect(tokens.expiresAt, isNull);
    });
  });
}
