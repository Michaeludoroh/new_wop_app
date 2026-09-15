import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/ebooks/ebook_service.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/screens/ebook_screen.dart';
import 'package:ministry_mobile/screens/my_library_screen.dart';

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

class _AuthenticatedAuthProvider extends AuthProvider {
  _AuthenticatedAuthProvider()
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

Widget _wrapAuthenticated(Widget child) {
  return AuthScope(
    notifier: _AuthenticatedAuthProvider(),
    child: MaterialApp(home: child),
  );
}

class _FakeEbookService extends EbookService {
  @override
  Future<EbookListResponse> getEbooks({
    String? search,
    String? category,
    bool? featured,
    bool? recent,
  }) async {
    final free = EbookItem(
      id: 'ebook-free',
      title: 'Faith Walk',
      author: 'Ada',
      description: 'A free title.',
      category: 'Faith',
      coverImage: '',
      price: 0,
      isPremium: false,
    );
    return EbookListResponse(data: [free], featured: const [], recent: [free]);
  }

  @override
  Future<RecentlyReadResponse> getRecentlyRead({int limit = 10}) async {
    return RecentlyReadResponse(data: []);
  }

  @override
  Future<LibraryResponse> getMyLibrary() async {
    return LibraryResponse(
      purchased: [],
      subscription: [],
      continueReading: [],
      downloads: [],
      history: [],
      recentlyRead: [],
    );
  }
}

void main() {
  testWidgets('ebook screen renders empty catalog states', (tester) async {
    await tester.pumpWidget(
      _wrapAuthenticated(EbookScreen(service: _FakeEbookService())),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('eBooks'), findsOneWidget);
    expect(find.text('No featured eBooks yet.'), findsOneWidget);
    expect(find.text('Faith Walk'), findsWidgets);
    expect(find.byTooltip('Download'), findsWidgets);
  });

  testWidgets('my library screen renders empty state', (tester) async {
    await tester.pumpWidget(
      _wrapAuthenticated(MyLibraryScreen(service: _FakeEbookService())),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('My Library'), findsOneWidget);
    expect(
      find.textContaining('Your library is empty'),
      findsOneWidget,
    );
    expect(find.text('Browse eBook Catalog'), findsOneWidget);
    expect(find.text('Recently Read'), findsNothing);
  });

  testWidgets('library empty state opens ebook catalog', (tester) async {
    await tester.pumpWidget(
      AuthScope(
        notifier: _AuthenticatedAuthProvider(),
        child: MaterialApp(
          routes: {
            EbookScreen.routeName: (_) =>
                EbookScreen(service: _FakeEbookService()),
          },
          home: MyLibraryScreen(service: _FakeEbookService()),
        ),
      ),
    );

    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Browse eBook Catalog'));
    await tester.pumpAndSettle();

    expect(find.text('eBooks'), findsOneWidget);
  });
}
