import 'package:flutter/material.dart';

import 'dashboard_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.authStatusLabel,
    this.authError,
  });

  final String authStatusLabel;
  final String? authError;

  @override
  Widget build(BuildContext context) {
    return DashboardScreen(
      authStatusLabel: authStatusLabel,
      authError: authError,
    );
  }
}
