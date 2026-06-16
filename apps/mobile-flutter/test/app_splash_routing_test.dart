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
import 'package:ministry_mobile/screens/auth_landing_screen.dart';
import 'package:ministry_mobile/screens/dashboard_screen.dart';
import 'package:ministry_mobile/screens/home_screen.dart';
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

class _FakeTokenStorageService extends TokenStorageService {
  @override
  Future<String?> getAccessToken() async => null;
}

class _TestAuthProvider extends AuthProvider {
  _TestAuthProvider(AuthState initialState)
      : _testState = initialState,
        super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  final AuthState _testState;

  @override
  AuthState get state => _testState;
}

void main() {
  Widget buildWithState(AuthState state) {
    final notifier = _TestAuthProvider(state);
    return AuthScope(
      notifier: notifier,
      child: MinistryMobileApp(theme: AppTheme.lightTheme),
    );
  }

  testWidgets('shows SplashScreen when auth is unknown and not bootstrapped',
      (tester) async {
    await tester.pumpWidget(
      buildWithState(
        const AuthState(
          status: AuthStatus.unknown,
          isBootstrapped: false,
        ),
      ),
    );

    await tester.pump();

    expect(find.byType(SplashScreen), findsOneWidget);
    expect(find.byType(HomeScreen), findsNothing);
    expect(find.byType(AuthLandingScreen), findsNothing);
  });

  testWidgets('shows DashboardScreen when authenticated and bootstrapped',
      (tester) async {
    await tester.pumpWidget(
      buildWithState(
        const AuthState(
          status: AuthStatus.authenticated,
          isBootstrapped: true,
        ),
      ),
    );

    await tester.pump();

    expect(find.byType(DashboardScreen), findsOneWidget);
    expect(find.byType(SplashScreen), findsNothing);
    expect(find.byType(AuthLandingScreen), findsNothing);
  });

  testWidgets('shows AuthLandingScreen when unauthenticated and bootstrapped',
      (tester) async {
    await tester.pumpWidget(
      buildWithState(
        const AuthState(
          status: AuthStatus.unauthenticated,
          isBootstrapped: true,
        ),
      ),
    );

    await tester.pump();

    expect(find.byType(AuthLandingScreen), findsOneWidget);
    expect(find.byType(SplashScreen), findsNothing);
    expect(find.byType(HomeScreen), findsNothing);
  });
}
