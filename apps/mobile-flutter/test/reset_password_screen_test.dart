import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/reset_password_screen.dart';

class _FakeTokenStorageService extends TokenStorageService {
  _FakeTokenStorageService();

  String? _accessToken;
  String? _refreshToken;
  DateTime? _expiry;

  @override
  Future<void> saveAccessToken(String token) async => _accessToken = token;

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<void> saveRefreshToken(String token) async => _refreshToken = token;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<void> saveTokenExpiry(DateTime expiry) async => _expiry = expiry;

  @override
  Future<DateTime?> getTokenExpiry() async => _expiry;

  @override
  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    _expiry = null;
  }
}

class _FakeAuthService extends AuthService {
  _FakeAuthService();

  ResetPasswordRequest? resetPasswordPayload;

  @override
  Future<void> resetPassword(ResetPasswordRequest request) async {
    resetPasswordPayload = request;
  }
}

Widget _buildTestApp(AuthProvider provider) {
  return AuthScope(
    notifier: provider,
    child: const MaterialApp(
      home: ResetPasswordScreen(),
    ),
  );
}

void main() {
  testWidgets('shows validation errors for empty fields', (tester) async {
    final authService = _FakeAuthService();
    final provider = AuthProvider(
      authService: authService,
      tokenStorageService: _FakeTokenStorageService(),
    );

    await tester.pumpWidget(_buildTestApp(provider));

    await tester.tap(find.byKey(const Key('reset_password_submit_button')));
    await tester.pumpAndSettle();

    expect(find.text('Reset token is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('shows validation error for short password', (tester) async {
    final authService = _FakeAuthService();
    final provider = AuthProvider(
      authService: authService,
      tokenStorageService: _FakeTokenStorageService(),
    );

    await tester.pumpWidget(_buildTestApp(provider));

    await tester.enterText(
      find.byKey(const Key('reset_password_token_field')),
      'token-123',
    );
    await tester.enterText(
      find.byKey(const Key('reset_password_new_password_field')),
      '123',
    );
    await tester.tap(find.byKey(const Key('reset_password_submit_button')));
    await tester.pumpAndSettle();

    expect(find.text('Password must be at least 6 characters'), findsOneWidget);
  });

  testWidgets('submits valid reset password request', (tester) async {
    final authService = _FakeAuthService();
    final provider = AuthProvider(
      authService: authService,
      tokenStorageService: _FakeTokenStorageService(),
    );

    await tester.pumpWidget(_buildTestApp(provider));

    await tester.enterText(
      find.byKey(const Key('reset_password_token_field')),
      'valid-token',
    );
    await tester.enterText(
      find.byKey(const Key('reset_password_new_password_field')),
      'newPassword123',
    );

    await tester.tap(find.byKey(const Key('reset_password_submit_button')));
    await tester.pumpAndSettle();

    expect(authService.resetPasswordPayload, isNotNull);
    expect(authService.resetPasswordPayload!.token, equals('valid-token'));
    expect(
      authService.resetPasswordPayload!.newPassword,
      equals('newPassword123'),
    );
    expect(
      find.byKey(const Key('reset_password_success_message')),
      findsOneWidget,
    );
  });
}
