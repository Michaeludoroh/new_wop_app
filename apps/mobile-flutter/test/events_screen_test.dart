import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/events/event_service.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';
import 'package:ministry_mobile/screens/events_screen.dart';

class _FakeEventService extends EventService {
  @override
  Future<EventListResponse> getEvents({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return const EventListResponse(data: [], total: 0, limit: 20, offset: 0);
  }

  @override
  Future<EventListResponse> getFeaturedEvents({int limit = 8}) async {
    return const EventListResponse(data: [], total: 0, limit: 8, offset: 0);
  }
}

void main() {
  testWidgets('renders empty upcoming events state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: EventsScreen(service: _FakeEventService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Upcoming Events'), findsOneWidget);
    expect(find.text('No upcoming events found.'), findsOneWidget);
  });
}
