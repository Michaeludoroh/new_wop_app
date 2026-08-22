import 'package:flutter/material.dart';

import '../core/clips/clip_service.dart';
import '../core/ebooks/ebook_service.dart';
import '../core/events/event_service.dart';
import '../core/homepage/homepage_feed_sources.dart';
import 'dashboard_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.authStatusLabel,
    this.authError,
    this.homepageSources,
    this.eventService,
    this.clipService,
    this.libraryService,
  });

  final String authStatusLabel;
  final String? authError;
  final HomepageFeedSources? homepageSources;
  final EventService? eventService;
  final ClipService? clipService;
  final EbookService? libraryService;

  @override
  Widget build(BuildContext context) {
    return DashboardScreen(
      authStatusLabel: authStatusLabel,
      authError: authError,
      homepageSources: homepageSources,
      eventService: eventService,
      clipService: clipService,
      libraryService: libraryService,
    );
  }
}
