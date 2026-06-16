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

  @override
  Future<String?> getAccessToken() async => accessToken;

  @override
  Future<String?> getRefreshToken() async => refreshToken;

  @override
  Future<DateTime?> getTokenExpiry() async => expiry;

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
    this.user,
    this.throwOnRefresh = false,
  }) : super();

  final AuthUser? user;
  final bool throwOnRefresh;

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
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
    );
  }

  @override
  Future<AuthUser> me() async {
    meCallCount += 1;
    return user ??
        AuthUser(
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
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
  group('AuthProvider.bootstrap', () {
    test('sets unauthenticated when no access token is stored', () async {
      final storage = _FakeTokenStorageService(accessToken: null);
      final authService = _FakeAuthService();
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();

      expect(provider.state.status, AuthStatus.unauthenticated);
      expect(provider.state.isBootstrapped, isTrue);
      expect(provider.state.isBusy, isFalse);
      expect(provider.state.user, isNull);
      expect(authService.meCallCount, 0);
      expect(authService.refreshCallCount, 0);
    });

    test('restores authenticated session when token is valid', () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'valid-token',
        expiry: DateTime.now().toUtc().add(const Duration(minutes: 30)),
      );
      final authService = _FakeAuthService(
        user: AuthUser(
          id: 'user-123',
          email: 'restore@example.com',
          name: 'Restore Flow',
          role: 'member',
        ),
      );
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();

      expect(provider.state.status, AuthStatus.authenticated);
      expect(provider.state.isBootstrapped, isTrue);
      expect(provider.state.isBusy, isFalse);
      expect(provider.state.user?.email, 'restore@example.com');
      expect(authService.refreshCallCount, 0);
      expect(authService.meCallCount, 1);
      expect(storage.clearTokensCalled, isFalse);
    });

    test('refreshes expired token and restores session when refresh succeeds',
        () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiry: DateTime.now().toUtc().subtract(const Duration(minutes: 5)),
      );
      final authService = _FakeAuthService();
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();

      expect(authService.refreshCallCount, 1);
      expect(authService.meCallCount, 1);
      expect(provider.state.status, AuthStatus.authenticated);
      expect(provider.state.isBootstrapped, isTrue);
      expect(provider.state.isBusy, isFalse);
      expect(storage.clearTokensCalled, isFalse);
    });

    test('clears tokens and becomes unauthenticated when refresh fails',
        () async {
      final storage = _FakeTokenStorageService(
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiry: DateTime.now().toUtc().subtract(const Duration(minutes: 5)),
      );
      final authService = _FakeAuthService(throwOnRefresh: true);
      final provider = AuthProvider(
        authService: authService,
        tokenStorageService: storage,
      );

      await provider.bootstrap();

      expect(authService.refreshCallCount, 1);
      expect(authService.meCallCount, 0);
      expect(storage.clearTokensCalled, isTrue);
      expect(provider.state.status, AuthStatus.unauthenticated);
      expect(provider.state.isBootstrapped, isTrue);
      expect(provider.state.isBusy, isFalse);
      expect(provider.state.user, isNull);
    });
  });
}
