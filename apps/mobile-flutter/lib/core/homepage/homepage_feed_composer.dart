import 'package:flutter/material.dart';

import '../announcements/models/announcement_models.dart';
import '../clips/models/clip_models.dart';
import '../ebooks/models/ebook_models.dart';
import '../events/models/event_models.dart';
import '../mentorship/models/mentorship_models.dart';
import '../programs/models/program_models.dart';
import '../../screens/announcement_details_screen.dart';
import '../../screens/clip_details_screen.dart';
import '../../screens/ebook_details_screen.dart';
import '../../screens/event_details_screen.dart';
import '../../screens/mentorship_details_screen.dart';
import '../../screens/program_details_screen.dart';
import 'homepage_feed_item.dart';
import 'homepage_relative_time.dart';

const _importantAnnouncementCategories = {
  'NEWS',
  'EVENT',
  'CONFERENCE',
  'PRAYER_MEETING',
};

List<HomepageFeedItem> composeHomepageFeed({
  required List<AnnouncementItem> announcements,
  required List<ClipItem> clips,
  required List<EventItem> events,
  required List<EbookItem> ebooks,
  required List<ProgramItem> programs,
  required List<MentorshipItem> mentorship,
  required DateTime now,
}) {
  final items = <HomepageFeedItem>[];
  final usedIds = <String>{};

  void add(HomepageFeedItem? item) {
    if (item == null || usedIds.contains(item.keyId)) return;
    usedIds.add(item.keyId);
    items.add(item);
  }

  final importantAnnouncement = _firstWhere(
    announcements,
    (item) => _importantAnnouncementCategories.contains(item.category.toUpperCase()),
  );
  if (importantAnnouncement != null) {
    add(
      _announcementItem(
        importantAnnouncement,
        now: now,
        eyebrow: 'Important announcement',
        prominent: true,
      ),
    );
  }

  if (announcements.isNotEmpty) {
    add(
      _announcementItem(
        announcements.first,
        now: now,
        eyebrow: 'Latest announcement',
        prominent: importantAnnouncement == null,
      ),
    );
  }

  if (clips.isNotEmpty) {
    final playable = clips.where((clip) => clip.hasPlayableVideo).toList();
    if (playable.isNotEmpty) {
      add(_clipItem(playable.first, now: now));
    }
  }

  final upcomingEvents = events
      .where((event) => !event.startDateTime.isBefore(now))
      .toList()
    ..sort((a, b) => a.startDateTime.compareTo(b.startDateTime));

  if (upcomingEvents.isNotEmpty) {
    add(_eventItem(upcomingEvents.first, prominent: true));
  }

  if (ebooks.isNotEmpty) {
    add(_ebookItem(ebooks.first, now: now));
  }

  final highlightedProgram = _firstWhere(programs, (item) => item.featured) ??
      (programs.isEmpty ? null : programs.first);
  if (highlightedProgram != null) {
    add(
      _programItem(
        highlightedProgram,
        now: now,
        eyebrow: highlightedProgram.featured ? 'Featured program' : 'New program',
        prominent: true,
      ),
    );
  }

  final upcomingPrograms = programs
      .where(
        (program) =>
            !program.startDate.isBefore(now) && program.id != highlightedProgram?.id,
      )
      .toList()
    ..sort((a, b) => a.startDate.compareTo(b.startDate));
  if (upcomingPrograms.isNotEmpty) {
    add(
      _programItem(
        upcomingPrograms.first,
        now: now,
        eyebrow: 'Upcoming program',
      ),
    );
  }

  if (mentorship.isNotEmpty) {
    final highlightedClass =
        _firstWhere(mentorship, (item) => item.featured) ?? mentorship.first;
    add(_mentorshipItem(highlightedClass, now: now));
  }

  for (final event in upcomingEvents.skip(1).take(3)) {
    add(_eventItem(event));
  }

  return items;
}

T? _firstWhere<T>(Iterable<T> items, bool Function(T item) test) {
  for (final item in items) {
    if (test(item)) return item;
  }
  return null;
}

HomepageFeedItem _announcementItem(
  AnnouncementItem item, {
  required DateTime now,
  required String eyebrow,
  bool prominent = false,
}) {
  return HomepageFeedItem(
    keyId: 'announcement:${item.id}',
    kind: HomepageFeedKind.announcement,
    eyebrow: eyebrow,
    title: item.title,
    subtitle: item.categoryLabel,
    body: previewText(item.content),
    imageUrl: item.imageUrl,
    timestampLabel: formatRelativeTimestamp(item.publishedAt ?? item.createdAt, now),
    actionLabel: 'Read',
    routeName: AnnouncementDetailsScreen.routeName,
    routeArguments: item.id,
    prominent: prominent,
    fallbackIcon: Icons.campaign_outlined,
  );
}

HomepageFeedItem _clipItem(ClipItem item, {required DateTime now}) {
  return HomepageFeedItem(
    keyId: 'clip:${item.id}',
    kind: HomepageFeedKind.clip,
    eyebrow: 'Latest clip',
    title: item.title,
    subtitle: [
      if (item.speaker != null && item.speaker!.trim().isNotEmpty) item.speaker,
      if (item.durationLabel.isNotEmpty) item.durationLabel,
    ].join(' • '),
    body: previewText(item.description),
    imageUrl: item.thumbnailUrl,
    timestampLabel: formatRelativeTimestamp(item.publishedAt, now),
    actionLabel: 'Play',
    routeName: ClipDetailsScreen.routeName,
    routeArguments: item.id,
    prominent: true,
    fallbackIcon: Icons.play_circle_outline,
  );
}

HomepageFeedItem _eventItem(EventItem item, {bool prominent = false}) {
  return HomepageFeedItem(
    keyId: 'event:${item.id}',
    kind: HomepageFeedKind.event,
    eyebrow: prominent ? 'Upcoming event' : 'More upcoming events',
    title: item.title,
    subtitle: [formatEventSchedule(item.startDateTime), item.locationLabel]
        .where((part) => part.trim().isNotEmpty)
        .join(' • '),
    body: previewText(item.description),
    imageUrl: item.bannerImageUrl,
    timestampLabel: item.dateLabel,
    actionLabel: item.registrationRequired ? 'RSVP' : 'View',
    routeName: EventDetailsScreen.routeName,
    routeArguments: item.slug.isEmpty ? item.id : item.slug,
    prominent: prominent,
    fallbackIcon: Icons.event_outlined,
  );
}

HomepageFeedItem _ebookItem(EbookItem item, {required DateTime now}) {
  return HomepageFeedItem(
    keyId: 'ebook:${item.id}',
    kind: HomepageFeedKind.ebook,
    eyebrow: 'Latest publication',
    title: item.title,
    subtitle: item.author,
    body: previewText(item.description),
    imageUrl: item.coverImage,
    timestampLabel: formatRelativeTimestamp(item.createdAt, now),
    actionLabel: 'Read',
    routeName: EbookDetailsScreen.routeName,
    routeArguments: item.id,
    prominent: true,
    fallbackIcon: Icons.menu_book_outlined,
  );
}

HomepageFeedItem _programItem(
  ProgramItem item, {
  required DateTime now,
  required String eyebrow,
  bool prominent = false,
}) {
  return HomepageFeedItem(
    keyId: 'program:${item.id}',
    kind: HomepageFeedKind.program,
    eyebrow: eyebrow,
    title: item.title,
    subtitle: [
      item.instructorLabel,
      if (!item.startDate.isBefore(now)) 'Starts ${item.dateLabel}',
    ].join(' • '),
    body: previewText(item.description),
    imageUrl: item.bannerImageUrl,
    timestampLabel: formatRelativeTimestamp(item.startDate, now),
    actionLabel: 'View',
    routeName: ProgramDetailsScreen.routeName,
    routeArguments: item.slug.isEmpty ? item.id : item.slug,
    prominent: prominent,
    fallbackIcon: Icons.school_outlined,
  );
}

HomepageFeedItem _mentorshipItem(MentorshipItem item, {required DateTime now}) {
  return HomepageFeedItem(
    keyId: 'mentorship:${item.id}',
    kind: HomepageFeedKind.mentorship,
    eyebrow: 'New mentorship class',
    title: item.title,
    subtitle: [
      item.mentorLabel,
      if (!item.startDate.isBefore(now)) 'Starts ${item.dateLabel}',
    ].join(' • '),
    body: previewText(item.description ?? item.mentor.bio),
    imageUrl: item.bannerImageUrl ?? item.mentorImageUrl ?? item.mentor.imageUrl,
    timestampLabel: formatRelativeTimestamp(item.startDate, now),
    actionLabel: 'View',
    routeName: MentorshipDetailsScreen.routeName,
    routeArguments: item.slug.isEmpty ? item.id : item.slug,
    prominent: true,
    fallbackIcon: Icons.groups_outlined,
  );
}
