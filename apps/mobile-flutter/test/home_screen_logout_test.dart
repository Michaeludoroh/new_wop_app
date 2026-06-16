import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/home_screen.dart';

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super();

  @override
  Future<AuthSession> login(LoginRequest request) {
    throw UnimplementedError();
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
  Future<void> logout() async {}

  @override
  Future<AuthUser> me() {
    throw UnimplementedError();
  }

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {}

  @override
  Future<void> resetPassword(ResetPasswordRequest request) async {}
}

class _FakeTokenStorageService extends TokenStorageService {}

class _TestAuthProvider extends AuthProvider {
  _TestAuthProvider()
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  int logoutCallCount = 0;

  @override
  Future<void> logout() async {
    logoutCallCount += 1;
  }
}

void main() {
  Widget buildTestApp(_TestAuthProvider provider) {
    return MaterialApp(
      home: AuthScope(
        notifier: provider,
        child: const HomeScreen(authStatusLabel: 'Authenticated'),
      ),
    );
  }

  testWidgets('tapping logout button triggers provider logout', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));

    expect(find.byKey(const Key('home_logout_button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('home_logout_button')));
    await tester.pump();

    expect(provider.logoutCallCount, 1);
  });
}
