import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/announcements/models/announcement_models.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_composer.dart';
import 'package:ministry_mobile/core/homepage/homepage_feed_item.dart';
import 'package:ministry_mobile/core/mentorship/models/mentorship_models.dart';
import 'package:ministry_mobile/core/programs/models/program_models.dart';

void main() {
  final now = DateTime.utc(2026, 8, 19, 12);

  test('composes a ministry feed from live content models without hardcoded ids', () {
    final items = composeHomepageFeed(
      announcements: [
        AnnouncementItem(
          id: 'ann-latest',
          title: 'Weekly update',
          content: 'General ministry news for members.',
          category: 'GENERAL_UPDATE',
          status: 'PUBLISHED',
          isPublished: true,
          publishedAt: now.subtract(const Duration(hours: 2)),
        ),
        AnnouncementItem(
          id: 'ann-news',
          title: 'Conference registration',
          content: 'Join us this weekend.',
          category: 'CONFERENCE',
          status: 'PUBLISHED',
          isPublished: true,
          publishedAt: now.subtract(const Duration(hours: 5)),
        ),
      ],
      clips: [
        const ClipItem(
          id: 'clip-1',
          title: 'Faith for Today',
          videoUrl: 'https://cdn.example.com/clip.mp4',
          category: 'TEACHING',
          viewCount: 4,
          featured: false,
          isPublished: true,
          tags: [],
          scriptureReferences: [],
          speaker: 'Pastor Ada',
          durationSeconds: 125,
        ),
      ],
      events: [
        EventItem(
          id: 'event-soon',
          title: 'Prayer Night',
          slug: 'prayer-night',
          category: 'PRAYER',
          locationType: 'PHYSICAL',
          venue: 'Main auditorium',
          startDateTime: now.add(const Duration(days: 1)),
          endDateTime: now.add(const Duration(days: 1, hours: 2)),
          registrationRequired: true,
          attendeeCount: 12,
          featured: false,
          published: true,
        ),
        EventItem(
          id: 'event-later',
          title: 'Youth Fellowship',
          slug: 'youth-fellowship',
          category: 'FELLOWSHIP',
          locationType: 'ONLINE',
          startDateTime: now.add(const Duration(days: 4)),
          endDateTime: now.add(const Duration(days: 4, hours: 2)),
          registrationRequired: false,
          attendeeCount: 0,
          featured: false,
          published: true,
        ),
      ],
      ebooks: [
        EbookItem(
          id: 'ebook-1',
          title: 'Walking in Purpose',
          author: 'Rev. James',
          description: 'A guide for the season.',
          category: 'DEVOTIONAL',
          coverImage: '',
          price: 0,
          isPremium: false,
          createdAt: now.subtract(const Duration(days: 1)),
        ),
      ],
      programs: [
        ProgramItem(
          id: 'program-featured',
          title: 'Leadership Cohort',
          slug: 'leadership-cohort',
          category: 'LEADERSHIP',
          startDate: now.add(const Duration(days: 10)),
          endDate: now.add(const Duration(days: 40)),
          enrolledCount: 8,
          featured: true,
          published: true,
          instructorName: 'Sis. Grace',
        ),
        ProgramItem(
          id: 'program-upcoming',
          title: 'Prayer School',
          slug: 'prayer-school',
          category: 'PRAYER',
          startDate: now.add(const Duration(days: 3)),
          endDate: now.add(const Duration(days: 17)),
          enrolledCount: 3,
          featured: false,
          published: true,
          instructorName: 'Bro. Paul',
        ),
      ],
      mentorship: [
        MentorshipItem(
          id: 'mentor-1',
          title: 'Women in Ministry',
          slug: 'women-in-ministry',
          category: 'MENTORSHIP',
          startDate: now.add(const Duration(days: 6)),
          endDate: now.add(const Duration(days: 90)),
          enrolledCount: 5,
          waitlistCount: 0,
          featured: true,
          published: true,
          mentor: const MentorProfile(name: 'Auntie Ruth'),
          mentorName: 'Auntie Ruth',
        ),
      ],
      now: now,
    );

    expect(
      items.map((item) => item.kind).toList(),
      [
        HomepageFeedKind.announcement,
        HomepageFeedKind.announcement,
        HomepageFeedKind.clip,
        HomepageFeedKind.event,
        HomepageFeedKind.ebook,
        HomepageFeedKind.program,
        HomepageFeedKind.program,
        HomepageFeedKind.mentorship,
        HomepageFeedKind.event,
      ],
    );
    expect(items.first.eyebrow, 'Important announcement');
    expect(items.first.title, 'Conference registration');
    expect(items[3].title, 'Prayer Night');
    expect(items[3].actionLabel, 'RSVP');
    expect(items.last.title, 'Youth Fellowship');
    expect(items.any((item) => item.keyId == 'clip:clip-1'), isTrue);
    expect(items.any((item) => item.keyId == 'ebook:ebook-1'), isTrue);
  });

  test('skips empty ministry sections instead of inserting placeholders', () {
    final items = composeHomepageFeed(
      announcements: const [],
      clips: const [],
      events: const [],
      ebooks: const [],
      programs: const [],
      mentorship: const [],
      now: now,
    );

    expect(items, isEmpty);
  });

  test('latest clip prefers newest published playable clip over featured list order', () {
    final items = composeHomepageFeed(
      announcements: const [],
      clips: [
        ClipItem(
          id: 'clip-old-featured',
          title: 'Older featured clip',
          videoUrl: 'https://cdn.example.com/old.mp4',
          category: 'TEACHING',
          viewCount: 40,
          featured: true,
          isPublished: true,
          tags: const [],
          scriptureReferences: const [],
          publishedAt: now.subtract(const Duration(days: 20)),
        ),
        ClipItem(
          id: 'clip-new',
          title: 'Brand new clip',
          videoUrl: 'https://cdn.example.com/new.mp4',
          category: 'TEACHING',
          viewCount: 1,
          featured: false,
          isPublished: true,
          tags: const [],
          scriptureReferences: const [],
          publishedAt: now.subtract(const Duration(minutes: 5)),
        ),
      ],
      events: const [],
      ebooks: const [],
      programs: const [],
      mentorship: const [],
      now: now,
    );

    expect(items.single.kind, HomepageFeedKind.clip);
    expect(items.single.title, 'Brand new clip');
    expect(items.single.keyId, 'clip:clip-new');
  });

  test('ignores past events when upcoming events exist', () {
    final items = composeHomepageFeed(
      announcements: const [],
      clips: const [],
      events: [
        EventItem(
          id: 'past',
          title: 'Last week',
          slug: 'last-week',
          category: 'GENERAL',
          locationType: 'PHYSICAL',
          startDateTime: now.subtract(const Duration(days: 3)),
          endDateTime: now.subtract(const Duration(days: 3)),
          registrationRequired: false,
          attendeeCount: 0,
          featured: true,
          published: true,
        ),
        EventItem(
          id: 'next',
          title: 'This Saturday',
          slug: 'this-saturday',
          category: 'GENERAL',
          locationType: 'ONLINE',
          startDateTime: now.add(const Duration(days: 2)),
          endDateTime: now.add(const Duration(days: 2)),
          registrationRequired: false,
          attendeeCount: 0,
          featured: false,
          published: true,
        ),
      ],
      ebooks: const [],
      programs: const [],
      mentorship: const [],
      now: now,
    );

    expect(items, hasLength(1));
    expect(items.single.title, 'This Saturday');
    expect(items.single.eyebrow, 'Upcoming event');
  });

  test('skips clips that are known not to have playable media', () {
    final items = composeHomepageFeed(
      announcements: const [],
      clips: const [
        ClipItem(
          id: 'clip-missing',
          title: 'Broken clip',
          videoUrl: 'https://woppandmopp.com/api/v1/uploads/clips/media/missing.mp4',
          category: 'TEACHING',
          viewCount: 0,
          featured: true,
          isPublished: true,
          tags: [],
          scriptureReferences: [],
          videoAvailable: false,
        ),
      ],
      events: const [],
      ebooks: const [],
      programs: const [],
      mentorship: const [],
      now: now,
    );

    expect(items.where((item) => item.kind == HomepageFeedKind.clip), isEmpty);
  });
}
