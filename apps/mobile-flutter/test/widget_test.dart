// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ministry_mobile/app.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';
import 'package:ministry_mobile/screens/splash_screen.dart';

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

  @override
  AuthState get state => const AuthState(
        status: AuthStatus.unknown,
        isBootstrapped: false,
      );
}

void main() {
  testWidgets('renders MinistryMobileApp shell', (WidgetTester tester) async {
    final provider = _TestAuthProvider();

    await tester.pumpWidget(
      AuthScope(
        notifier: provider,
        child: MinistryMobileApp(theme: AppTheme.lightTheme),
      ),
    );

    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.byType(SplashScreen), findsOneWidget);
  });
}
