import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/forgot_password_screen.dart';

class FakeAuthService extends AuthService {
  FakeAuthService();

  @override
  Future<AuthSession> login(LoginRequest request) {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession> register(RegisterRequest request) {
    throw UnimplementedError();
  }

  @override
  Future<AuthTokens> refresh() async {
    return AuthTokens(
      accessToken: 'access',
      refreshToken: 'refresh',
    );
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

class FakeTokenStorageService extends TokenStorageService {
  FakeTokenStorageService();

  @override
  Future<void> saveAccessToken(String token) async {}

  @override
  Future<String?> getAccessToken() async => null;

  @override
  Future<void> saveRefreshToken(String token) async {}

  @override
  Future<String?> getRefreshToken() async => null;

  @override
  Future<void> saveTokenExpiry(DateTime expiry) async {}

  @override
  Future<DateTime?> getTokenExpiry() async => null;

  @override
  Future<void> clearTokens() async {}
}

class TestAuthProvider extends AuthProvider {
  TestAuthProvider()
      : super(
          authService: FakeAuthService(),
          tokenStorageService: FakeTokenStorageService(),
        );

  int forgotPasswordCalls = 0;
  ForgotPasswordRequest? lastForgotPasswordRequest;
  bool shouldThrowOnForgotPassword = false;

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {
    forgotPasswordCalls += 1;
    lastForgotPasswordRequest = request;
    if (shouldThrowOnForgotPassword) {
      throw Exception('forgot password failed');
    }
  }
}

Widget buildTestApp(TestAuthProvider provider) {
  return MaterialApp(
    home: AuthScope(
      notifier: provider,
      child: const ForgotPasswordScreen(),
    ),
  );
}

void main() {
  testWidgets('shows validation errors for empty email', (tester) async {
    final provider = TestAuthProvider();

    await tester.pumpWidget(buildTestApp(provider));
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(provider.forgotPasswordCalls, 0);
  });

  testWidgets('shows validation error for invalid email', (tester) async {
    final provider = TestAuthProvider();

    await tester.pumpWidget(buildTestApp(provider));
    await tester.enterText(
      find.byKey(const Key('forgot_password_email_field')),
      'invalid-email',
    );
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump();

    expect(find.text('Enter a valid email'), findsOneWidget);
    expect(provider.forgotPasswordCalls, 0);
  });

  testWidgets('submits valid forgot password request', (tester) async {
    final provider = TestAuthProvider();

    await tester.pumpWidget(buildTestApp(provider));
    await tester.enterText(
      find.byKey(const Key('forgot_password_email_field')),
      'jane@example.com',
    );
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump();

    expect(provider.forgotPasswordCalls, 1);
    expect(provider.lastForgotPasswordRequest, isNotNull);
    expect(provider.lastForgotPasswordRequest!.email, 'jane@example.com');
  });

  testWidgets('shows error when forgot password throws', (tester) async {
    final provider = TestAuthProvider()..shouldThrowOnForgotPassword = true;

    await tester.pumpWidget(buildTestApp(provider));
    await tester.enterText(
      find.byKey(const Key('forgot_password_email_field')),
      'jane@example.com',
    );
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump(const Duration(milliseconds: 50));

    expect(
      find.text('Failed to request password reset. Please try again.'),
      findsOneWidget,
    );
    expect(provider.forgotPasswordCalls, 1);
  });
}
