import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';
import 'package:ministry_mobile/core/theme/theme_controller.dart';
import 'package:ministry_mobile/core/theme/theme_scope.dart';
import 'package:ministry_mobile/screens/about_screen.dart';
import 'package:ministry_mobile/screens/forgot_password_screen.dart';
import 'package:ministry_mobile/screens/notification_settings_screen.dart';
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

class _TestAuthProvider extends AuthProvider {
  _TestAuthProvider({AuthUser? user})
      : user = user ??
            AuthUser(
              id: 'user-1',
              email: 'member@example.com',
              name: 'Ada',
              role: 'member',
            ),
        super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  final AuthUser user;
  int logoutCalls = 0;

  @override
  AuthState get state => AuthState(
        status: AuthStatus.authenticated,
        isBootstrapped: true,
        user: user,
      );

  @override
  Future<void> logout() async {
    logoutCalls += 1;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Future<void> pumpSettings(
    WidgetTester tester, {
    required _TestAuthProvider auth,
    required ThemeController themeController,
  }) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ThemeScope(
        notifier: themeController,
        child: AuthScope(
          notifier: auth,
          child: AnimatedBuilder(
            animation: themeController,
            builder: (context, _) {
              return MaterialApp(
                theme: AppTheme.lightTheme,
                darkTheme: AppTheme.darkTheme,
                themeMode: themeController.themeMode,
                themeAnimationDuration: Duration.zero,
                routes: {
                  ProfileScreen.routeName: (_) => const Scaffold(
                        body: Text('Profile Screen'),
                      ),
                  ForgotPasswordScreen.routeName: (_) => const Scaffold(
                        body: Text('Reset Password Screen'),
                      ),
                  AboutScreen.routeName: (_) => const Scaffold(
                        body: Text('About Screen'),
                      ),
                  NotificationSettingsScreen.routeName: (_) => const Scaffold(
                        body: Text('Notification Settings Screen'),
                      ),
                },
                home: const SettingsScreen(),
              );
            },
          ),
        ),
      ),
    );
  }

  testWidgets('shows settings sections and account name and email',
      (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Name'), findsOneWidget);
    expect(find.byKey(const Key('settings_account_name')), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('Email'), findsWidgets);
    expect(find.byKey(const Key('settings_account_email')), findsOneWidget);
    expect(find.text('member@example.com'), findsOneWidget);
    expect(find.text('Reset Password'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
    expect(find.text('Appearance'), findsOneWidget);
    expect(find.text('System'), findsOneWidget);
    expect(find.text('Light'), findsOneWidget);
    expect(find.text('Dark'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Notification Preferences'), findsOneWidget);
    expect(find.text('About WOPP'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);
    expect(find.text('Terms of Service'), findsOneWidget);
    expect(find.text('Contact / Support'), findsOneWidget);
  });

  testWidgets('shows Name not set when the session user has no name',
      (tester) async {
    final auth = _TestAuthProvider(
      user: AuthUser(
        id: 'user-1',
        email: 'member@example.com',
        role: 'member',
      ),
    );
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    expect(find.text('Name not set'), findsOneWidget);
    expect(find.text('member@example.com'), findsOneWidget);
    expect(find.text('Ada'), findsNothing);
  });

  testWidgets('profile opens the existing profile screen', (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.byKey(const Key('settings_profile_tile')));
    await tester.pumpAndSettle();
    expect(find.text('Profile Screen'), findsOneWidget);
  });

  testWidgets('reset password opens existing forgot-password flow',
      (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.byKey(const Key('settings_reset_password_tile')));
    await tester.pumpAndSettle();
    expect(find.text('Reset Password Screen'), findsOneWidget);
  });

  testWidgets('logout uses existing AuthProvider.logout', (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.byKey(const Key('settings_logout_tile')));
    await tester.pumpAndSettle();
    expect(auth.logoutCalls, 1);
  });

  testWidgets('theme radios persist the selected mode', (tester) async {
    final prefs = await SharedPreferences.getInstance();
    final auth = _TestAuthProvider();
    final theme = ThemeController(preferences: prefs);
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.text('Dark'));
    await tester.pump();

    expect(theme.themeMode, ThemeMode.dark);
    expect(prefs.getString(ThemeController.storageKey), 'dark');
  });

  testWidgets('Settings follows Light, Dark, and System brightness',
      (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    Future<Brightness> settingsBrightness() {
      return Future.value(
        Theme.of(tester.element(find.byType(SettingsScreen))).brightness,
      );
    }

    await theme.setThemeMode(ThemeMode.light);
    await tester.pump();
    expect(await settingsBrightness(), Brightness.light);
    expect(
      Theme.of(tester.element(find.byType(SettingsScreen)))
          .scaffoldBackgroundColor,
      AppTheme.lightTheme.scaffoldBackgroundColor,
    );

    await theme.setThemeMode(ThemeMode.dark);
    await tester.pumpAndSettle();
    expect(await settingsBrightness(), Brightness.dark);
    expect(
      Theme.of(tester.element(find.byType(SettingsScreen)))
          .scaffoldBackgroundColor,
      AppTheme.darkTheme.scaffoldBackgroundColor,
    );

    tester.binding.platformDispatcher.platformBrightnessTestValue =
        Brightness.dark;
    addTearDown(
      tester.binding.platformDispatcher.clearPlatformBrightnessTestValue,
    );
    await theme.setThemeMode(ThemeMode.system);
    await tester.pumpAndSettle();
    expect(await settingsBrightness(), Brightness.dark);

    tester.binding.platformDispatcher.platformBrightnessTestValue =
        Brightness.light;
    await tester.pumpAndSettle();
    expect(await settingsBrightness(), Brightness.light);
  });

  testWidgets('notification preferences open the notification settings screen',
      (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.byKey(const Key('settings_notification_preferences_tile')));
    await tester.pumpAndSettle();
    expect(find.text('Notification Settings Screen'), findsOneWidget);
  });

  testWidgets('about WOPP opens about screen', (tester) async {
    final auth = _TestAuthProvider();
    final theme = ThemeController();
    await pumpSettings(tester, auth: auth, themeController: theme);

    await tester.tap(find.text('About WOPP'));
    await tester.pumpAndSettle();
    expect(find.text('About Screen'), findsOneWidget);
  });
}
