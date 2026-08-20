import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_models.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_provider.dart';
import 'package:ministry_mobile/screens/profile_screen.dart';
import 'package:ministry_mobile/widgets/trial_banner.dart';

class _FakeAuthService extends AuthService {
  _FakeAuthService() : super();

  @override
  Future<AuthSession> login(LoginRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession> register(RegisterRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<AuthTokens> refresh() async {
    throw UnimplementedError();
  }

  @override
  Future<void> logout() async {}

  @override
  Future<AuthUser> me() async {
    return AuthUser(id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'USER');
  }

  @override
  Future<void> forgotPassword(ForgotPasswordRequest request) async {}

  @override
  Future<void> resetPassword(ResetPasswordRequest request) async {}
}

class _FakeTokenStorageService extends TokenStorageService {}

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

class _FakeSubscriptionProvider extends SubscriptionProvider {
  @override
  SubscriptionStatusModel? get status => SubscriptionStatusModel(
        plan: MembershipPlan.premium,
        status: 'PENDING',
        access: SubscriptionAccessModel(
          hasPremiumAccess: true,
          isGracePeriod: false,
          renewalDue: false,
          cancelAtPeriodEnd: false,
          isTrial: true,
          daysRemaining: 4,
        ),
      );

  @override
  Future<void> refresh() async {}
}

void main() {
  testWidgets('profile screen renders account and policies section', (tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final provider = _TestAuthProvider(
      AuthState(
        status: AuthStatus.authenticated,
        user: AuthUser(id: 'user-1', email: 'user@example.com', name: 'Test User', role: 'USER'),
        isBootstrapped: true,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScope(
          notifier: provider,
          child: SubscriptionScope(
            notifier: _FakeSubscriptionProvider(),
            child: const ProfileScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Account'), findsOneWidget);
    expect(find.text('WOPP Premium'), findsOneWidget);
    expect(find.text('Status: Free Trial'), findsOneWidget);
    expect(find.text('4 days remaining'), findsOneWidget);
    expect(find.text('Manage subscription'), findsOneWidget);
    expect(find.text('Policies & Governance'), findsOneWidget);
    expect(find.text('Terms of Use'), findsOneWidget);
    // Appears in Policies & Governance and again in StoreLegalLinks.
    expect(find.text('Privacy Policy'), findsNWidgets(2));
    expect(find.text('Community Guidelines'), findsOneWidget);
    expect(find.text('Content Sharing Rules'), findsOneWidget);
    expect(find.text('Legal & Support'), findsOneWidget);
    expect(find.text('Save profile'), findsOneWidget);
  });
}
