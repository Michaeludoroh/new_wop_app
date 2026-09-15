import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/constants/app_constants.dart';
import 'package:ministry_mobile/screens/about_screen.dart';
import 'package:ministry_mobile/screens/announcements_screen.dart';
import 'package:ministry_mobile/screens/mentorship_screen.dart';
import 'package:ministry_mobile/screens/more_screen.dart';
import 'package:ministry_mobile/screens/programs_screen.dart';
import 'package:ministry_mobile/screens/settings_screen.dart';
import 'package:ministry_mobile/screens/subscription_screen.dart';

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

class _AuthenticatedMoreAuthProvider extends AuthProvider {
  _AuthenticatedMoreAuthProvider()
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: TokenStorageService(),
        );

  @override
  AuthState get state => AuthState(
        status: AuthStatus.authenticated,
        isBootstrapped: true,
        user: AuthUser(
          id: 'user-1',
          email: 'member@example.com',
          name: 'Ada',
          role: 'member',
        ),
      );
}

void main() {
  testWidgets('MoreScreen shows ministry menu items', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MoreScreen(),
      ),
    );

    expect(find.text('Announcements'), findsOneWidget);
    expect(find.text('Programs'), findsOneWidget);
    expect(find.text('Mentorship'), findsOneWidget);
    expect(find.text('WOPP Premium'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text(AppConstants.aboutTitle), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to about', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          AboutScreen.routeName: (_) => const Scaffold(
                body: Text('About Screen'),
              ),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text(AppConstants.aboutTitle));
    await tester.pumpAndSettle();

    expect(find.text('About Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to announcements', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          AnnouncementsScreen.routeName: (_) => const Scaffold(
                body: Text('Announcements Screen'),
              ),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Announcements'));
    await tester.pumpAndSettle();

    expect(find.text('Announcements Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to programs', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          ProgramsScreen.routeName: (_) =>
              const Scaffold(body: Text('Programs Screen')),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Programs'));
    await tester.pumpAndSettle();

    expect(find.text('Programs Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to mentorship', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          MentorshipScreen.routeName: (_) =>
              const Scaffold(body: Text('Mentorship Screen')),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Mentorship'));
    await tester.pumpAndSettle();
    expect(find.text('Mentorship Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen prompts login for subscription when guest',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MoreScreen(),
      ),
    );

    await tester.tap(find.text('WOPP Premium'));
    await tester.pumpAndSettle();
    expect(find.text('Login Required'), findsOneWidget);
    expect(find.text('Subscription Screen'), findsNothing);
  });

  testWidgets('MoreScreen navigates to subscription when signed in',
      (tester) async {
    await tester.pumpWidget(
      AuthScope(
        notifier: _AuthenticatedMoreAuthProvider(),
        child: MaterialApp(
          routes: {
            SubscriptionScreen.routeName: (_) =>
                const Scaffold(body: Text('Subscription Screen')),
          },
          home: const MoreScreen(),
        ),
      ),
    );

    await tester.tap(find.text('WOPP Premium'));
    await tester.pumpAndSettle();
    expect(find.text('Subscription Screen'), findsOneWidget);
  });

  testWidgets('MoreScreen navigates to settings', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          SettingsScreen.routeName: (_) => const Scaffold(
                body: Text('Settings Screen'),
              ),
        },
        home: const MoreScreen(),
      ),
    );

    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    expect(find.text('Settings Screen'), findsOneWidget);
  });
}
