import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/announcements/announcement_service.dart';
import 'package:ministry_mobile/core/announcements/models/announcement_models.dart';
import 'package:ministry_mobile/core/clips/clip_service.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';
import 'package:ministry_mobile/core/ebooks/ebook_service.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/core/events/event_service.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_sources.dart';
import 'package:ministry_mobile/core/mentorship/mentorship_service.dart';
import 'package:ministry_mobile/core/mentorship/models/mentorship_models.dart';
import 'package:ministry_mobile/core/programs/models/program_models.dart';
import 'package:ministry_mobile/core/programs/program_service.dart';
import 'package:ministry_mobile/screens/clip_details_screen.dart';
import 'package:ministry_mobile/widgets/homepage/homepage_feed.dart';

class _FakeAnnouncementService extends AnnouncementService {
  _FakeAnnouncementService(this.items);
  final List<AnnouncementItem> items;

  @override
  Future<AnnouncementListResponse> getAnnouncements({
    String? search,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    return AnnouncementListResponse(
      data: items,
      total: items.length,
      page: page,
      limit: limit,
    );
  }
}

class _FakeClipService extends ClipService {
  _FakeClipService(this.items);
  final List<ClipItem> items;

  @override
  Future<ClipListResponse> getClips({
    String? search,
    String? category,
    bool? featured,
    String? sort,
    int limit = 20,
    int offset = 0,
  }) async {
    return ClipListResponse(data: items, total: items.length, limit: limit, offset: offset);
  }
}

class _FakeEventService extends EventService {
  _FakeEventService(this.items);
  final List<EventItem> items;

  @override
  Future<EventListResponse> getEvents({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return EventListResponse(data: items, total: items.length, limit: limit, offset: offset);
  }
}

class _FakeEbookService extends EbookService {
  _FakeEbookService(this.items);
  final List<EbookItem> items;

  @override
  Future<EbookListResponse> getEbooks({
    String? search,
    String? category,
    bool? featured,
    bool? recent,
  }) async {
    return EbookListResponse(data: items, featured: const [], recent: items);
  }
}

class _FakeProgramService extends ProgramService {
  _FakeProgramService(this.items);
  final List<ProgramItem> items;

  @override
  Future<ProgramListResponse> getPrograms({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return ProgramListResponse(data: items, total: items.length, limit: limit, offset: offset);
  }
}

class _FakeMentorshipService extends MentorshipService {
  _FakeMentorshipService(this.items);
  final List<MentorshipItem> items;

  @override
  Future<MentorshipListResponse> getClasses({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return MentorshipListResponse(data: items, total: items.length, limit: limit, offset: offset);
  }
}

HomepageFeedSources emptySources() {
  return HomepageFeedSources(
    announcements: _FakeAnnouncementService(const []),
    clips: _FakeClipService(const []),
    events: _FakeEventService(const []),
    ebooks: _FakeEbookService(const []),
    programs: _FakeProgramService(const []),
    mentorship: _FakeMentorshipService(const []),
  );
}

void main() {
  testWidgets('renders latest ministry content from existing APIs', (tester) async {
    tester.view.physicalSize = const Size(400, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final now = DateTime.now();
    final sources = HomepageFeedSources(
      announcements: _FakeAnnouncementService([
        AnnouncementItem(
          id: 'ann-1',
          title: 'Sunday gathering',
          content: 'Join us this Sunday morning.',
          category: 'NEWS',
          status: 'PUBLISHED',
          isPublished: true,
          publishedAt: now.subtract(const Duration(hours: 3)),
        ),
      ]),
      clips: _FakeClipService(const [
        ClipItem(
          id: 'clip-1',
          title: 'Faith for Today',
          videoUrl: 'https://cdn.example.com/clip.mp4',
          category: 'TEACHING',
          viewCount: 2,
          featured: false,
          isPublished: true,
          tags: [],
          scriptureReferences: [],
          speaker: 'Pastor Ada',
        ),
      ]),
      events: _FakeEventService([
        EventItem(
          id: 'event-1',
          title: 'Prayer Night',
          slug: 'prayer-night',
          category: 'PRAYER',
          locationType: 'PHYSICAL',
          venue: 'Chapel',
          startDateTime: now.add(const Duration(days: 2)),
          endDateTime: now.add(const Duration(days: 2, hours: 2)),
          registrationRequired: true,
          attendeeCount: 0,
          featured: false,
          published: true,
        ),
      ]),
      ebooks: _FakeEbookService([
        EbookItem(
          id: 'ebook-1',
          title: 'Walking in Purpose',
          author: 'Rev. James',
          description: 'A new publication for the house.',
          category: 'DEVOTIONAL',
          coverImage: '',
          price: 0,
          isPremium: false,
          createdAt: now.subtract(const Duration(days: 1)),
        ),
      ]),
      programs: _FakeProgramService(const []),
      mentorship: _FakeMentorshipService(const []),
    );

    String? openedRoute;
    Object? openedArgs;

    await tester.pumpWidget(
      MaterialApp(
        onGenerateRoute: (settings) {
          openedRoute = settings.name;
          openedArgs = settings.arguments;
          return MaterialPageRoute<void>(
            builder: (_) => const SizedBox.shrink(),
            settings: settings,
          );
        },
        home: Scaffold(
          body: HomepageFeed(
            sources: sources,
            memberName: 'Ada',
          ),
        ),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Welcome, Ada'), findsOneWidget);
    expect(find.text("What's new in the ministry — latest teaching, events, and publications."), findsOneWidget);
    expect(find.text('Sunday gathering'), findsOneWidget);
    expect(find.text('Faith for Today'), findsOneWidget);
    expect(find.text('Prayer Night'), findsOneWidget);
    expect(find.text('Walking in Purpose'), findsOneWidget);
    expect(find.text('Nothing new to show yet.'), findsNothing);

    await tester.tap(find.text('Play'));
    await tester.pump();
    await tester.pump();

    expect(openedRoute, ClipDetailsScreen.routeName);
    expect(openedArgs, 'clip-1');
  });

  testWidgets('shows an empty ministry state when there is no content', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HomepageFeed(sources: emptySources()),
        ),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Nothing new to show yet.'), findsOneWidget);
    expect(find.text('Refresh'), findsOneWidget);
  });
}
