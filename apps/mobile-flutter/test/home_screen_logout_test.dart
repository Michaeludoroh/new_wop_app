import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_sources.dart';
import 'package:ministry_mobile/core/announcements/announcement_service.dart';
import 'package:ministry_mobile/core/announcements/models/announcement_models.dart';
import 'package:ministry_mobile/core/clips/clip_service.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';
import 'package:ministry_mobile/core/ebooks/ebook_service.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/core/events/event_service.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';
import 'package:ministry_mobile/core/mentorship/mentorship_service.dart';
import 'package:ministry_mobile/core/mentorship/models/mentorship_models.dart';
import 'package:ministry_mobile/core/programs/program_service.dart';
import 'package:ministry_mobile/core/programs/models/program_models.dart';
import 'package:ministry_mobile/screens/home_screen.dart';

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

class _FakeTokenStorageService extends TokenStorageService {}

class _TestAuthProvider extends AuthProvider {
  _TestAuthProvider()
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
        );

  int logoutCallCount = 0;

  @override
  Future<void> logout() async {
    logoutCallCount += 1;
  }
}

class _EmptyAnnouncementService extends AnnouncementService {
  @override
  Future<AnnouncementListResponse> getAnnouncements({
    String? search,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    return const AnnouncementListResponse(data: [], total: 0, page: 1, limit: 20);
  }
}

class _EmptyClipService extends ClipService {
  @override
  Future<ClipListResponse> getClips({
    String? search,
    String? category,
    bool? featured,
    String? sort,
    int limit = 20,
    int offset = 0,
  }) async {
    return const ClipListResponse(data: [], total: 0, limit: 20, offset: 0);
  }
}

class _EmptyEventService extends EventService {
  @override
  Future<EventListResponse> getEvents({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return const EventListResponse(data: [], total: 0, limit: 20, offset: 0);
  }
}

class _EmptyEbookService extends EbookService {
  @override
  Future<EbookListResponse> getEbooks({
    String? search,
    String? category,
    bool? featured,
    bool? recent,
  }) async {
    return EbookListResponse(data: const [], featured: const [], recent: const []);
  }
}

class _EmptyProgramService extends ProgramService {
  @override
  Future<ProgramListResponse> getPrograms({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return const ProgramListResponse(data: [], total: 0, limit: 20, offset: 0);
  }
}

class _EmptyMentorshipService extends MentorshipService {
  @override
  Future<MentorshipListResponse> getClasses({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return const MentorshipListResponse(data: [], total: 0, limit: 20, offset: 0);
  }
}

void main() {
  Widget buildTestApp(_TestAuthProvider provider) {
    return MaterialApp(
      home: AuthScope(
        notifier: provider,
        child: HomeScreen(
          authStatusLabel: 'Authenticated',
          homepageSources: HomepageFeedSources(
            announcements: _EmptyAnnouncementService(),
            clips: _EmptyClipService(),
            events: _EmptyEventService(),
            ebooks: _EmptyEbookService(),
            programs: _EmptyProgramService(),
            mentorship: _EmptyMentorshipService(),
          ),
        ),
      ),
    );
  }

  testWidgets('tapping logout button triggers provider logout', (tester) async {
    final provider = _TestAuthProvider();
    await tester.pumpWidget(buildTestApp(provider));

    expect(find.byKey(const Key('home_logout_button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('home_logout_button')));
    await tester.pump();

    expect(provider.logoutCallCount, 1);
  });
}
