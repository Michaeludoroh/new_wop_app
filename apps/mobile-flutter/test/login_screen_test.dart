import 'package:dio/dio.dart';
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
  _TestAuthProvider({
    this.storedEmail,
    this.loginError,
  }) : super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  int loginCallCount = 0;
  LoginRequest? lastLoginRequest;
  String? storedEmail;
  String? persistedEmail;
  Object? loginError;

  @override
  Future<String?> rememberedEmail() async => storedEmail;

  @override
  Future<void> persistRememberedEmail(String? email) async {
    persistedEmail = email;
  }

  @override
  Future<void> login(LoginRequest request) async {
    loginCallCount += 1;
    lastLoginRequest = request;
    if (loginError != null) {
      throw loginError!;
    }
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
    await tester.pump();

    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    expect(provider.loginCallCount, 0);
  });

  testWidgets('submits valid credentials and can remember email', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();

    await tester.enterText(
      find.byKey(const Key('login_email_field')),
      'user@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('login_password_field')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('login_remember_email_checkbox')));
    await tester.pump();

    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(provider.loginCallCount, 1);
    expect(provider.lastLoginRequest?.email, 'user@example.com');
    expect(provider.lastLoginRequest?.password, 'password123');
    expect(provider.persistedEmail, 'user@example.com');
  });

  testWidgets('prefills remembered email without exposing a password', (tester) async {
    final provider = _TestAuthProvider(storedEmail: 'saved@example.com');
    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();
    await tester.pump();

    expect(find.text('saved@example.com'), findsOneWidget);
    final passwordField = tester.widget<TextFormField>(
      find.byKey(const Key('login_password_field')),
    );
    expect(passwordField.controller?.text, isEmpty);
    expect(find.text('password123'), findsNothing);
  });

  testWidgets('shows invalid credentials for failed login', (tester) async {
    final provider = _TestAuthProvider(
      loginError: DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 401,
          data: {'message': 'Unauthorized'},
        ),
      ),
    );
    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();

    await tester.enterText(
      find.byKey(const Key('login_email_field')),
      'user@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('login_password_field')),
      'wrongpass',
    );
    await tester.tap(find.byKey(const Key('login_submit_button')));
    await tester.pump();

    expect(find.text('Invalid email or password.'), findsOneWidget);
    expect(find.textContaining('Bearer'), findsNothing);
  });

  testWidgets('shows a network message when the API cannot be reached', (tester) async {
    final provider = _TestAuthProvider(
      loginError: DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        type: DioExceptionType.connectionError,
      ),
    );
    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();

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

    expect(
      find.text('Could not reach the server. Check your connection and try again.'),
      findsOneWidget,
    );
  });

  testWidgets('configures OS autofill hints on email and password fields', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));
    await tester.pump();

    final emailField = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(const Key('login_email_field')),
        matching: find.byType(TextField),
      ),
    );
    final passwordField = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(const Key('login_password_field')),
        matching: find.byType(TextField),
      ),
    );

    expect(emailField.autofillHints, contains(AutofillHints.email));
    expect(passwordField.autofillHints, contains(AutofillHints.password));
  });
}
