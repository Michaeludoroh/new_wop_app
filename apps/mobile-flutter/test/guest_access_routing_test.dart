import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/router/app_router.dart';
import 'package:ministry_mobile/screens/announcements_screen.dart';
import 'package:ministry_mobile/screens/events_screen.dart';
import 'package:ministry_mobile/screens/login_screen.dart';
import 'package:ministry_mobile/screens/programs_screen.dart';
import 'package:ministry_mobile/screens/profile_screen.dart';
import 'package:ministry_mobile/widgets/login_required.dart';

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

class _GuestAuthProvider extends AuthProvider {
  _GuestAuthProvider()
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: TokenStorageService(),
        );

  @override
  AuthState get state => const AuthState(
        status: AuthStatus.unauthenticated,
        isBootstrapped: true,
      );
}

void main() {
  Future<void> pumpGuestApp(WidgetTester tester, {required Widget home}) async {
    await tester.pumpWidget(
      AuthScope(
        notifier: _GuestAuthProvider(),
        child: MaterialApp(
          onGenerateRoute: AppRouter.onGenerateRoute,
          home: home,
        ),
      ),
    );
  }

  testWidgets('guests can open public Events', (tester) async {
    await pumpGuestApp(
      tester,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () =>
              Navigator.of(context).pushNamed(EventsScreen.routeName),
          child: const Text('open events'),
        ),
      ),
    );

    await tester.tap(find.text('open events'));
    await tester.pump();
    await tester.pump();

    expect(find.byType(EventsScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
    await tester.pump(const Duration(seconds: 30));
  });

  testWidgets('guests can open public Programs', (tester) async {
    await pumpGuestApp(
      tester,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () =>
              Navigator.of(context).pushNamed(ProgramsScreen.routeName),
          child: const Text('open programs'),
        ),
      ),
    );

    await tester.tap(find.text('open programs'));
    await tester.pump();
    await tester.pump();

    expect(find.byType(ProgramsScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
    await tester.pump(const Duration(seconds: 30));
  });

  testWidgets('guests can open public Announcements', (tester) async {
    await pumpGuestApp(
      tester,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () =>
              Navigator.of(context).pushNamed(AnnouncementsScreen.routeName),
          child: const Text('open announcements'),
        ),
      ),
    );

    await tester.tap(find.text('open announcements'));
    await tester.pump();
    await tester.pump();

    expect(find.byType(AnnouncementsScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
    await tester.pump(const Duration(seconds: 30));
  });

  testWidgets('guests see Login Required for Profile', (tester) async {
    await pumpGuestApp(
      tester,
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () =>
              Navigator.of(context).pushNamed(ProfileScreen.routeName),
          child: const Text('open profile'),
        ),
      ),
    );

    await tester.tap(find.text('open profile'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginRequiredScreen), findsOneWidget);
    expect(find.byKey(const Key('login_required_login_button')), findsOneWidget);
    expect(find.byKey(const Key('login_required_register_button')), findsOneWidget);
    expect(find.byType(ProfileScreen), findsNothing);
  });
}
