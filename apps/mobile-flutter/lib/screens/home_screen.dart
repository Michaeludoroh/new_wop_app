import 'package:flutter/material.dart';

import '../core/homepage/homepage_feed_sources.dart';
import 'dashboard_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.authStatusLabel,
    this.authError,
    this.homepageSources,
  });

  final String authStatusLabel;
  final String? authError;
  final HomepageFeedSources? homepageSources;

  @override
  Widget build(BuildContext context) {
    return DashboardScreen(
      authStatusLabel: authStatusLabel,
      authError: authError,
      homepageSources: homepageSources,
    );
  }
}
