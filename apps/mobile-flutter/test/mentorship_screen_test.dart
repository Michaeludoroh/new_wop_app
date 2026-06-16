import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/mentorship/mentorship_service.dart';
import 'package:ministry_mobile/core/mentorship/models/mentorship_models.dart';
import 'package:ministry_mobile/screens/mentorship_screen.dart';

class _FakeMentorshipService extends MentorshipService {
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

  @override
  Future<MentorshipListResponse> getFeaturedClasses({int limit = 8}) async {
    return const MentorshipListResponse(data: [], total: 0, limit: 8, offset: 0);
  }
}

void main() {
  testWidgets('renders empty mentorship classes state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MentorshipScreen(service: _FakeMentorshipService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Mentorship'), findsOneWidget);
    expect(find.text('All Classes'), findsOneWidget);
    expect(find.text('No mentorship classes found.'), findsOneWidget);
  });
}
