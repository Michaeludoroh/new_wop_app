import 'package:flutter/material.dart';

import '../../core/announcements/models/announcement_models.dart';
import '../../core/clips/models/clip_models.dart';
import '../../core/constants/app_constants.dart';
import '../../core/ebooks/models/ebook_models.dart';
import '../../core/events/models/event_models.dart';
import '../../core/homepage/homepage_feed_composer.dart';
import '../../core/homepage/homepage_feed_item.dart';
import '../../core/homepage/homepage_feed_sources.dart';
import '../../core/logging/app_log.dart';
import '../../core/mentorship/models/mentorship_models.dart';
import '../../core/programs/models/program_models.dart';
import '../../core/theme/app_colors.dart';
import '../../screens/announcements_screen.dart';
import '../../screens/clips_screen.dart';
import '../../screens/ebook_screen.dart';
import '../../screens/events_screen.dart';
import '../../screens/mentorship_screen.dart';
import '../../screens/programs_screen.dart';
import 'homepage_feed_card.dart';

class HomepageFeed extends StatefulWidget {
  const HomepageFeed({
    super.key,
    this.sources,
    this.memberName,
  });

  final HomepageFeedSources? sources;
  final String? memberName;

  @override
  State<HomepageFeed> createState() => _HomepageFeedState();
}

class _HomepageFeedState extends State<HomepageFeed> {
  late final HomepageFeedSources _sources;
  bool _loading = true;
  List<HomepageFeedItem> _items = const [];
  bool _hadPartialFailure = false;

  @override
  void initState() {
    super.initState();
    _sources = widget.sources ?? HomepageFeedSources.live();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
    });

    var hadFailure = false;

    Future<T> safe<T>(Future<T> Function() load, T fallback) async {
      try {
        return await load();
      } catch (error) {
        hadFailure = true;
        AppLog.debug('Homepage feed source failed: $error');
        return fallback;
      }
    }

    final results = await Future.wait<Object>([
      safe(
        () => _sources.announcements.getAnnouncements(limit: 8),
        const AnnouncementListResponse(data: [], total: 0, page: 1, limit: 8),
      ),
      safe(
        () => _sources.clips.getClips(limit: 8),
        const ClipListResponse(data: [], total: 0, limit: 8, offset: 0),
      ),
      safe(
        () => _sources.events.getEvents(limit: 12),
        const EventListResponse(data: [], total: 0, limit: 12, offset: 0),
      ),
      safe(
        () => _sources.ebooks.getEbooks(recent: true),
        EbookListResponse(data: const [], featured: const [], recent: const []),
      ),
      safe(
        () => _sources.programs.getPrograms(limit: 8),
        const ProgramListResponse(data: [], total: 0, limit: 8, offset: 0),
      ),
      safe(
        () => _sources.mentorship.getClasses(limit: 8),
        const MentorshipListResponse(data: [], total: 0, limit: 8, offset: 0),
      ),
    ]);

    final announcements = (results[0] as AnnouncementListResponse).data;
    final clips = (results[1] as ClipListResponse).data;
    final events = (results[2] as EventListResponse).data;
    final ebooksResponse = results[3] as EbookListResponse;
    final ebooks = ebooksResponse.recent.isNotEmpty
        ? ebooksResponse.recent
        : ebooksResponse.data;
    final programs = (results[4] as ProgramListResponse).data;
    final mentorship = (results[5] as MentorshipListResponse).data;

    final items = composeHomepageFeed(
      announcements: announcements,
      clips: clips,
      events: events,
      ebooks: ebooks,
      programs: programs,
      mentorship: mentorship,
      now: DateTime.now(),
    );

    if (!mounted) return;
    setState(() {
      _items = items;
      _hadPartialFailure = hadFailure;
      _loading = false;
    });
  }

  void _open(HomepageFeedItem item) {
    Navigator.of(context).pushNamed(item.routeName, arguments: item.routeArguments);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final greetingName = widget.memberName?.trim();
    final horizontalPadding =
        MediaQuery.sizeOf(context).width > 600 ? 32.0 : 16.0;

    return RefreshIndicator(
      color: AppColors.primaryPurple,
      onRefresh: _load,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(horizontalPadding, 20, horizontalPadding, 8),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greetingName == null || greetingName.isEmpty
                        ? "What's new in the ministry"
                        : 'Welcome, $greetingName',
                    style: textTheme.headlineSmall?.copyWith(
                      color: AppColors.primaryPurple,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    greetingName == null || greetingName.isEmpty
                        ? 'The latest publications and upcoming activities from ${AppConstants.appName}.'
                        : "What's new in the ministry — latest teaching, events, and publications.",
                    style: textTheme.bodyLarge?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(horizontalPadding, 8, horizontalPadding, 12),
            sliver: const SliverToBoxAdapter(
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _QuickLinkChip(label: 'Announcements', routeName: AnnouncementsScreen.routeName),
                  _QuickLinkChip(label: 'Clips', routeName: ClipsScreen.routeName),
                  _QuickLinkChip(label: 'Events', routeName: EventsScreen.routeName),
                  _QuickLinkChip(label: 'Library', routeName: EbookScreen.routeName),
                  _QuickLinkChip(label: 'Programs', routeName: ProgramsScreen.routeName),
                  _QuickLinkChip(label: 'Mentorship', routeName: MentorshipScreen.routeName),
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.auto_awesome_outlined,
                        size: 40,
                        color: AppColors.primaryPurple,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _hadPartialFailure
                            ? 'The homepage could not load right now.'
                            : 'Nothing new to show yet.',
                        style: textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _hadPartialFailure
                            ? 'Pull to refresh, or browse a ministry section below.'
                            : 'When the ministry publishes announcements, clips, events, or publications, they will appear here.',
                        style: textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: _load,
                        child: const Text('Refresh'),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: EdgeInsets.fromLTRB(horizontalPadding, 4, horizontalPadding, 28),
              sliver: SliverList.separated(
                itemCount: _items.length + (_hadPartialFailure ? 1 : 0),
                separatorBuilder: (_, __) => const SizedBox(height: 14),
                itemBuilder: (context, index) {
                  if (_hadPartialFailure && index == 0) {
                    return Text(
                      'Some sections could not be refreshed. Pull down to try again.',
                      style: textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    );
                  }
                  final item = _items[_hadPartialFailure ? index - 1 : index];
                  return HomepageFeedCard(
                    key: ValueKey(item.keyId),
                    item: item,
                    onOpen: () => _open(item),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickLinkChip extends StatelessWidget {
  const _QuickLinkChip({
    required this.label,
    required this.routeName,
  });

  final String label;
  final String routeName;

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      label: Text(label),
      onPressed: () => Navigator.of(context).pushNamed(routeName),
    );
  }
}
