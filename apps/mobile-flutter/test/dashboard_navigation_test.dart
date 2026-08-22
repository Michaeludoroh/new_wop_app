import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/announcements/announcement_service.dart';
import 'package:ministry_mobile/core/announcements/models/announcement_models.dart';
import 'package:ministry_mobile/core/auth/auth_provider.dart';
import 'package:ministry_mobile/core/auth/auth_scope.dart';
import 'package:ministry_mobile/core/auth/auth_service.dart';
import 'package:ministry_mobile/core/auth/auth_state.dart';
import 'package:ministry_mobile/core/auth/models/auth_models.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/clips/clip_service.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';
import 'package:ministry_mobile/core/ebooks/ebook_service.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/core/events/event_service.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_sources.dart';
import 'package:ministry_mobile/core/mentorship/mentorship_service.dart';
import 'package:ministry_mobile/core/mentorship/models/mentorship_models.dart';
import 'package:ministry_mobile/core/programs/program_service.dart';
import 'package:ministry_mobile/core/programs/models/program_models.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_models.dart';
import 'package:ministry_mobile/core/subscriptions/subscription_provider.dart';
import 'package:ministry_mobile/screens/dashboard_screen.dart';
import 'package:ministry_mobile/widgets/trial_banner.dart';

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

class _AuthenticatedAuthProvider extends AuthProvider {
  _AuthenticatedAuthProvider()
      : super(
          authService: _FakeAuthService(),
          tokenStorageService: _FakeTokenStorageService(),
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

class _PremiumSubscriptionProvider extends SubscriptionProvider {
  @override
  SubscriptionStatusModel? get status => SubscriptionStatusModel(
        plan: MembershipPlan.premium,
        status: 'ACTIVE',
        access: SubscriptionAccessModel(
          hasPremiumAccess: true,
          isGracePeriod: false,
          renewalDue: false,
          cancelAtPeriodEnd: false,
          isSubscribed: true,
        ),
      );

  @override
  bool get loading => false;

  @override
  Future<void> refresh() async {}
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

  @override
  Future<ClipListResponse> getFeaturedClips({int limit = 10}) async {
    return const ClipListResponse(data: [], total: 0, limit: 10, offset: 0);
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

  @override
  Future<EventListResponse> getFeaturedEvents({int limit = 8}) async {
    return const EventListResponse(data: [], total: 0, limit: 8, offset: 0);
  }

  @override
  Future<EventRsvpListResponse> getMyRsvps() async {
    return const EventRsvpListResponse(data: []);
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

  @override
  Future<LibraryResponse> getMyLibrary() async {
    return LibraryResponse(
      purchased: const [],
      subscription: const [],
      continueReading: const [],
      downloads: const [],
      history: const [],
      recentlyRead: const [],
    );
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
  Widget buildDashboard() {
    return AuthScope(
      notifier: _AuthenticatedAuthProvider(),
      child: SubscriptionScope(
        notifier: _PremiumSubscriptionProvider(),
        child: MaterialApp(
          home: DashboardScreen(
            authStatusLabel: 'Authenticated',
            homepageSources: HomepageFeedSources(
              announcements: _EmptyAnnouncementService(),
              clips: _EmptyClipService(),
              events: _EmptyEventService(),
              ebooks: _EmptyEbookService(),
              programs: _EmptyProgramService(),
              mentorship: _EmptyMentorshipService(),
            ),
            eventService: _EmptyEventService(),
            clipService: _EmptyClipService(),
            libraryService: _EmptyEbookService(),
          ),
        ),
      ),
    );
  }

  Future<void> tapBottomNav(WidgetTester tester, String label) async {
    await tester.tap(find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text(label),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
  }

  testWidgets('tapping Events opens the events list directly', (tester) async {
    await tester.pumpWidget(buildDashboard());
    await tester.pump();

    expect(find.text('Open Events'), findsNothing);

    await tapBottomNav(tester, 'Events');
    await tester.pump();
    await tester.pump();

    expect(find.text('Open Events'), findsNothing);
    expect(find.byKey(const Key('dashboard_events_content')), findsOneWidget);
    expect(find.text('Upcoming Events'), findsOneWidget);
    expect(find.text('Search events, venue, description'), findsOneWidget);
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 1);
  });

  testWidgets('tapping Clips opens the clips list directly', (tester) async {
    await tester.pumpWidget(buildDashboard());
    await tester.pump();

    await tapBottomNav(tester, 'Clips');
    await tester.pump();
    await tester.pump();

    expect(find.text('Open Clips'), findsNothing);
    expect(find.byKey(const Key('dashboard_clips_content')), findsOneWidget);
    expect(find.text('Latest Clips'), findsOneWidget);
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 2);
  });

  testWidgets('tapping Library opens the library directly', (tester) async {
    await tester.pumpWidget(buildDashboard());
    await tester.pump();

    await tapBottomNav(tester, 'Library');
    await tester.pump();
    await tester.pump();

    expect(find.text('Open Library'), findsNothing);
    expect(find.byKey(const Key('dashboard_library_content')), findsOneWidget);
    expect(find.textContaining('Your library is empty'), findsOneWidget);
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 3);
  });

  testWidgets('bottom navigation selected state stays correct after tab changes',
      (tester) async {
    await tester.pumpWidget(buildDashboard());
    await tester.pump();

    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 0);

    await tapBottomNav(tester, 'Library');
    await tester.pump();
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 3);

    await tapBottomNav(tester, 'Events');
    await tester.pump();
    expect(tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex, 1);
    expect(find.text('Open Events'), findsNothing);
    expect(find.text('Open Library'), findsNothing);
  });
}
