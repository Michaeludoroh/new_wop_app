import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/router/app_router.dart';
import 'package:ministry_mobile/core/theme/theme_controller.dart';
import 'package:ministry_mobile/core/theme/theme_scope.dart';
import 'package:ministry_mobile/screens/login_screen.dart';
import 'package:ministry_mobile/screens/profile_screen.dart';
import 'package:ministry_mobile/screens/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAuthService extends AuthService {
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

class _SessionAuthProvider extends AuthProvider {
  _SessionAuthProvider({required bool authenticated})
      : _session = authenticated
            ? AuthState(
                status: AuthStatus.authenticated,
                isBootstrapped: true,
                user: AuthUser(
                  id: 'user-1',
                  email: 'member@example.com',
                  name: 'Ada',
                  role: 'member',
                ),
              )
            : const AuthState(
                status: AuthStatus.unauthenticated,
                isBootstrapped: true,
              ),
        super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  AuthState _session;
  int logoutCalls = 0;

  @override
  AuthState get state => _session;

  @override
  Future<String?> rememberedEmail() async => 'member@example.com';

  @override
  Future<void> logout() async {
    logoutCalls += 1;
    _session = const AuthState(
      status: AuthStatus.unauthenticated,
      isBootstrapped: true,
    );
    notifyListeners();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Future<void> pumpRoutedApp(
    WidgetTester tester, {
    required _SessionAuthProvider auth,
    Widget? home,
  }) async {
    tester.view.physicalSize = const Size(400, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final theme = ThemeController();
    await tester.pumpWidget(
      ThemeScope(
        notifier: theme,
        child: AuthScope(
          notifier: auth,
          child: MaterialApp(
            onGenerateRoute: AppRouter.onGenerateRoute,
            home: home,
          ),
        ),
      ),
    );
  }

  testWidgets('unauthenticated users cannot open Settings', (tester) async {
    final auth = _SessionAuthProvider(authenticated: false);
    await pumpRoutedApp(
      tester,
      auth: auth,
      home: Builder(
        builder: (context) {
          return TextButton(
            onPressed: () {
              Navigator.of(context).pushNamed(SettingsScreen.routeName);
            },
            child: const Text('open settings'),
          );
        },
      ),
    );

    await tester.tap(find.text('open settings'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(SettingsScreen), findsNothing);
  });

  testWidgets('unauthenticated users cannot open Profile', (tester) async {
    final auth = _SessionAuthProvider(authenticated: false);
    await pumpRoutedApp(
      tester,
      auth: auth,
      home: Builder(
        builder: (context) {
          return TextButton(
            onPressed: () {
              Navigator.of(context).pushNamed(ProfileScreen.routeName);
            },
            child: const Text('open profile'),
          );
        },
      ),
    );

    await tester.tap(find.text('open profile'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(ProfileScreen), findsNothing);
  });

  testWidgets('logout then Settings route stays protected', (tester) async {
    final auth = _SessionAuthProvider(authenticated: true);
    await pumpRoutedApp(
      tester,
      auth: auth,
      home: const SettingsScreen(),
    );

    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('member@example.com'), findsOneWidget);

    await tester.tap(find.byKey(const Key('settings_logout_tile')));
    await tester.pumpAndSettle();

    expect(auth.logoutCalls, 1);
    expect(auth.state.isAuthenticated, isFalse);
    expect(await auth.rememberedEmail(), 'member@example.com');

    final navigator = tester.state<NavigatorState>(find.byType(Navigator));
    navigator.pushNamed(SettingsScreen.routeName);
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
