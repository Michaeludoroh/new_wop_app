import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/login_screen.dart';

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super();

  @override
  Future<AuthSession> login(LoginRequest request) async {
    return AuthSession(
      user: AuthUser(id: '1', email: request.email),
      tokens: AuthTokens(accessToken: 'a', refreshToken: 'r'),
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

  int loginCallCount = 0;
  LoginRequest? lastLoginRequest;

  @override
  Future<void> login(LoginRequest request) async {
    loginCallCount += 1;
    lastLoginRequest = request;
  }
}

void main() {
  Widget buildTestApp(_TestAuthProvider provider) {
    return MaterialApp(
      home: AuthScope(
        notifier: provider,
        child: const LoginScreen(),
      ),
    );
  }

  testWidgets('shows validation errors for empty fields', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));

    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    expect(provider.loginCallCount, 0);
  });

  testWidgets('submits valid credentials', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));

    await tester.enterText(
      find.byKey(const Key('login_email_field')),
      'user@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('login_password_field')),
      'password123',
    );

    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(provider.loginCallCount, 1);
    expect(provider.lastLoginRequest?.email, 'user@example.com');
    expect(provider.lastLoginRequest?.password, 'password123');
  });
}
