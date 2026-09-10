import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/screens/delete_account_screen.dart';

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

  @override
  Future<void> deleteAccount() async {}
}

class _TestAuthProvider extends AuthProvider {
  _TestAuthProvider({this.deleteError})
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: TokenStorageService(),
        );

  Object? deleteError;
  int deleteCalls = 0;

  AuthState _session = AuthState(
    status: AuthStatus.authenticated,
    isBootstrapped: true,
    user: AuthUser(
      id: 'user-1',
      email: 'member@example.com',
      name: 'Ada',
      role: 'member',
    ),
  );

  @override
  AuthState get state => _session;

  @override
  Future<void> deleteAccount() async {
    deleteCalls += 1;
    if (deleteError != null) {
      _session = _session.copyWith(
        errorMessage:
            'Unable to delete your account. Check your connection and try again.',
        isBusy: false,
      );
      notifyListeners();
      throw deleteError!;
    }
    _session = const AuthState(
      status: AuthStatus.unauthenticated,
      isBootstrapped: true,
      infoMessage: 'Your WOPP account has been deleted.',
    );
    notifyListeners();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpScreen(WidgetTester tester, _TestAuthProvider auth) async {
    tester.view.physicalSize = const Size(400, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      AuthScope(
        notifier: auth,
        child: const MaterialApp(
          home: DeleteAccountScreen(),
        ),
      ),
    );
  }

  testWidgets(
      'explains permanent deletion and keeps submit disabled until confirmed',
      (tester) async {
    final auth = _TestAuthProvider();
    await pumpScreen(tester, auth);

    expect(find.text('Delete your WOPP account'), findsOneWidget);
    expect(find.textContaining('This action is permanent'), findsOneWidget);
    expect(find.textContaining('Your profile, name, email'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
              find.byKey(const Key('delete_account_submit_button')))
          .onPressed,
      isNull,
    );

    await tester
        .tap(find.byKey(const Key('delete_account_acknowledge_checkbox')));
    await tester.pump();
    expect(
      tester
          .widget<FilledButton>(
              find.byKey(const Key('delete_account_submit_button')))
          .onPressed,
      isNull,
    );

    await tester.enterText(
        find.byKey(const Key('delete_account_confirm_field')), 'DELETE');
    await tester.pump();
    expect(
      tester
          .widget<FilledButton>(
              find.byKey(const Key('delete_account_submit_button')))
          .onPressed,
      isNotNull,
    );
  });

  testWidgets(
      'requires a second confirmation then deletes and signs the user out',
      (tester) async {
    final auth = _TestAuthProvider();
    await pumpScreen(tester, auth);

    await tester
        .tap(find.byKey(const Key('delete_account_acknowledge_checkbox')));
    await tester.enterText(
        find.byKey(const Key('delete_account_confirm_field')), 'DELETE');
    await tester.pump();
    await tester.tap(find.byKey(const Key('delete_account_submit_button')));
    await tester.pumpAndSettle();

    expect(find.text('Delete account?'), findsOneWidget);
    expect(auth.deleteCalls, 0);

    await tester.tap(find.byKey(const Key('delete_account_confirm_button')));
    await tester.pumpAndSettle();

    expect(auth.deleteCalls, 1);
    expect(auth.state.isAuthenticated, isFalse);
    expect(auth.state.infoMessage, 'Your WOPP account has been deleted.');
  });

  testWidgets('keeps the user signed in when deletion fails', (tester) async {
    final auth = _TestAuthProvider(
      deleteError: DioException(
        requestOptions: RequestOptions(path: '/auth/account'),
        type: DioExceptionType.connectionError,
      ),
    );
    await pumpScreen(tester, auth);

    await tester
        .tap(find.byKey(const Key('delete_account_acknowledge_checkbox')));
    await tester.enterText(
        find.byKey(const Key('delete_account_confirm_field')), 'DELETE');
    await tester.pump();
    await tester.tap(find.byKey(const Key('delete_account_submit_button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('delete_account_confirm_button')));
    await tester.pumpAndSettle();

    expect(auth.deleteCalls, 1);
    expect(auth.state.isAuthenticated, isTrue);
    expect(
      find.text(
          'Could not reach the server. Check your connection and try again.'),
      findsOneWidget,
    );
  });
}
