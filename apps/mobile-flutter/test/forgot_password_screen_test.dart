import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
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
  TestAuthProvider({this.authenticatedUser})
      : super(
          authService: FakeAuthService(),
          tokenStorageService: FakeTokenStorageService(),
        );

  final AuthUser? authenticatedUser;
  int forgotPasswordCalls = 0;
  ForgotPasswordRequest? lastForgotPasswordRequest;
  Object? forgotPasswordError;

  @override
  AuthState get state {
    final user = authenticatedUser;
    if (user == null) {
      return const AuthState(
        status: AuthStatus.unauthenticated,
        isBootstrapped: true,
      );
    }
    return AuthState(
      status: AuthStatus.authenticated,
      isBootstrapped: true,
      user: user,
    );
  }

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {
    forgotPasswordCalls += 1;
    lastForgotPasswordRequest = request;
    if (forgotPasswordError != null) {
      throw forgotPasswordError!;
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
    expect(
      find.byKey(const Key('forgot_password_success_message')),
      findsOneWidget,
    );
    expect(
      find.text('If that email exists, a reset link has been sent.'),
      findsOneWidget,
    );
  });

  testWidgets('prefills authenticated email and explains reset email',
      (tester) async {
    final provider = TestAuthProvider(
      authenticatedUser: AuthUser(
        id: 'user-1',
        email: 'member@example.com',
        name: 'Ada',
        role: 'member',
      ),
    );

    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();

    expect(find.text('Reset Password'), findsOneWidget);
    expect(
      find.text(
        'There is no in-app change-password. We will email a reset link to your address.',
      ),
      findsOneWidget,
    );

    final field = tester.widget<TextFormField>(
      find.byKey(const Key('forgot_password_email_field')),
    );
    expect(field.controller?.text, 'member@example.com');
  });

  testWidgets('authenticated submit uses the prefilled email', (tester) async {
    final provider = TestAuthProvider(
      authenticatedUser: AuthUser(
        id: 'user-1',
        email: 'member@example.com',
        name: 'Ada',
        role: 'member',
      ),
    );

    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump();

    expect(provider.forgotPasswordCalls, 1);
    expect(provider.lastForgotPasswordRequest?.email, 'member@example.com');
    expect(
      find.text('If that email exists, a reset link has been sent.'),
      findsOneWidget,
    );
  });

  testWidgets('shows error when forgot password throws', (tester) async {
    final provider = TestAuthProvider()
      ..forgotPasswordError = Exception('Unable to send reset email.');

    await tester.pumpWidget(buildTestApp(provider));
    await tester.enterText(
      find.byKey(const Key('forgot_password_email_field')),
      'jane@example.com',
    );
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Unable to send reset email.'), findsOneWidget);
    expect(provider.forgotPasswordCalls, 1);
  });

  testWidgets('shows a timeout message when the reset request times out',
      (tester) async {
    final provider = TestAuthProvider()
      ..forgotPasswordError = DioException(
        requestOptions: RequestOptions(path: '/auth/forgot-password'),
        type: DioExceptionType.receiveTimeout,
      );

    await tester.pumpWidget(buildTestApp(provider));
    await tester.enterText(
      find.byKey(const Key('forgot_password_email_field')),
      'jane@example.com',
    );
    await tester.tap(find.byKey(const Key('forgot_password_submit_button')));
    await tester.pump(const Duration(milliseconds: 50));

    expect(
      find.text('The request timed out. Check your connection and try again.'),
      findsOneWidget,
    );
    expect(find.textContaining('Bearer'), findsNothing);
    expect(provider.forgotPasswordCalls, 1);
  });

  testWidgets('hides tokens and passwords from reset errors', (tester) async {
    final provider = TestAuthProvider()
      ..forgotPasswordError = Exception(
        'Bearer secret-token password=hunter2 leaked',
      );

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
    expect(find.textContaining('Bearer'), findsNothing);
    expect(find.textContaining('hunter2'), findsNothing);
    expect(find.textContaining('secret-token'), findsNothing);
  });
}
