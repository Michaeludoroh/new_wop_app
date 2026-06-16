import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/register_screen.dart';

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

  int registerCalls = 0;
  RegisterRequest? lastRegisterRequest;
  bool shouldThrowOnRegister = false;

  @override
  Future<void> register(RegisterRequest request) async {
    registerCalls += 1;
    lastRegisterRequest = request;
    if (shouldThrowOnRegister) {
      throw Exception('register failed');
    }
  }
}

Widget buildTestApp(TestAuthProvider provider) {
  return MaterialApp(
    home: AuthScope(
      notifier: provider,
      child: const RegisterScreen(),
    ),
  );
}

void main() {
  testWidgets('shows validation errors for empty fields', (tester) async {
    final provider = TestAuthProvider();

    await tester.pumpWidget(buildTestApp(provider));
    await tester.tap(find.byKey(const Key('register_submit_button')));
    await tester.pump();

    expect(find.text('Name is required'), findsOneWidget);
    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    expect(provider.registerCalls, 0);
  });

  testWidgets('submits valid register request', (tester) async {
    final provider = TestAuthProvider();

    await tester.pumpWidget(buildTestApp(provider));

    await tester.enterText(
        find.byKey(const Key('register_name_field')), 'Jane Doe');
    await tester.enterText(
        find.byKey(const Key('register_email_field')), 'jane@example.com');
    await tester.enterText(
        find.byKey(const Key('register_password_field')), 'strongpass');

    await tester.tap(find.byKey(const Key('register_submit_button')));
    await tester.pump();

    expect(provider.registerCalls, 1);
    expect(provider.lastRegisterRequest, isNotNull);
    expect(provider.lastRegisterRequest!.name, 'Jane Doe');
    expect(provider.lastRegisterRequest!.email, 'jane@example.com');
    expect(provider.lastRegisterRequest!.password, 'strongpass');
  });

  testWidgets('shows submit error when register throws', (tester) async {
    final provider = TestAuthProvider()..shouldThrowOnRegister = true;

    await tester.pumpWidget(buildTestApp(provider));

    await tester.enterText(
        find.byKey(const Key('register_name_field')), 'Jane Doe');
    await tester.enterText(
        find.byKey(const Key('register_email_field')), 'jane@example.com');
    await tester.enterText(
        find.byKey(const Key('register_password_field')), 'strongpass');

    await tester.tap(find.byKey(const Key('register_submit_button')));
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Registration failed. Please try again.'), findsOneWidget);
    expect(provider.registerCalls, 1);
  });
}
