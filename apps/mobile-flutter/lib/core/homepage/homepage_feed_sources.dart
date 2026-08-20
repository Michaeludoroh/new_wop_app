import '../announcements/announcement_service.dart';
import '../clips/clip_service.dart';
import '../ebooks/ebook_service.dart';
import '../events/event_service.dart';
import '../mentorship/mentorship_service.dart';
import '../programs/program_service.dart';

class HomepageFeedSources {
  const HomepageFeedSources({
    required this.announcements,
    required this.clips,
    required this.events,
    required this.ebooks,
    required this.programs,
    required this.mentorship,
  });

  factory HomepageFeedSources.live() {
    return HomepageFeedSources(
      announcements: AnnouncementService(),
      clips: ClipService(),
      events: EventService(),
      ebooks: EbookService(),
      programs: ProgramService(),
      mentorship: MentorshipService(),
    );
  }

  final AnnouncementService announcements;
  final ClipService clips;
  final EventService events;
  final EbookService ebooks;
  final ProgramService programs;
  final MentorshipService mentorship;
}
