import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/announcements/announcement_service.dart';
import 'package:ministry_mobile/core/announcements/models/announcement_models.dart';
import 'package:ministry_mobile/screens/announcements_screen.dart';

class _FakeAnnouncementService extends AnnouncementService {
  @override
  Future<AnnouncementListResponse> getAnnouncements({
    String? search,
    String? category,
    int page = 1,
    int limit = 20,
  }) async {
    return const AnnouncementListResponse(data: [], total: 0, page: 1, limit: 20);
  }

  @override
  Future<List<AnnouncementCategoryOption>> getCategories() async {
    return const [
      AnnouncementCategoryOption(value: 'NEWS', label: 'News'),
    ];
  }
}

void main() {
  testWidgets('renders empty announcements state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AnnouncementsScreen(service: _FakeAnnouncementService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Announcements'), findsOneWidget);
    expect(find.text('No announcements found.'), findsOneWidget);
  });
}
