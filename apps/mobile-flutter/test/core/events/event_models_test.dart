import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/events/models/event_models.dart';

void main() {
  test('parses RSVP fields and merges list statuses', () {
    final event = EventItem.fromJson({
      'id': 'event-1',
      'title': 'Prayer Night',
      'slug': 'prayer-night',
      'category': 'PRAYER',
      'locationType': 'PHYSICAL',
      'startDateTime': '2026-07-01T18:00:00.000Z',
      'endDateTime': '2026-07-01T20:00:00.000Z',
      'registrationRequired': true,
      'attendeeCount': 3,
      'featured': false,
      'published': true,
      'userRsvpStatus': 'REGISTERED',
    });

    expect(event.isRsvped, isTrue);
    expect(event.copyWith(userRsvpStatus: 'CANCELLED').userRsvpStatus, 'CANCELLED');
    expect(event.copyWith(clearUserRsvpStatus: true).isRsvped, isFalse);

    final list = EventListResponse.fromJson({
      'data': [
        {
          'id': 'event-1',
          'title': 'Prayer Night',
          'slug': 'prayer-night',
          'category': 'PRAYER',
          'locationType': 'PHYSICAL',
          'startDateTime': '2026-07-01T18:00:00.000Z',
          'endDateTime': '2026-07-01T20:00:00.000Z',
          'registrationRequired': true,
          'attendeeCount': 3,
          'featured': false,
          'published': true,
        },
      ],
      'total': 1,
      'limit': 20,
      'offset': 0,
    }).withRsvpStatuses({'event-1': 'REGISTERED'});

    expect(list.data.single.isRsvped, isTrue);

    final rsvpStatus = EventRsvpStatusItem.fromJson({
      'data': {
        'eventId': 'event-1',
        'status': 'REGISTERED',
        'registeredAt': '2026-06-10T10:00:00.000Z',
        'cancelledAt': null,
      },
    });
    expect(rsvpStatus.isRegistered, isTrue);

    final rsvpResponse = EventRsvpResponse.fromJson({
      'data': {
        'id': 'attendee-1',
        'status': 'REGISTERED',
        'event': {
          'id': 'event-1',
          'title': 'Prayer Night',
          'slug': 'prayer-night',
          'category': 'PRAYER',
          'locationType': 'PHYSICAL',
          'startDateTime': '2026-07-01T18:00:00.000Z',
          'endDateTime': '2026-07-01T20:00:00.000Z',
          'registrationRequired': true,
          'attendeeCount': 4,
          'featured': false,
          'published': true,
        },
      },
    });
    expect(rsvpResponse.event.isRsvped, isTrue);
    expect(rsvpResponse.event.attendeeCount, 4);

    final cancelResponse = EventCancelRsvpResponse.fromJson({
      'data': {
        'status': 'CANCELLED',
        'event': {
          'id': 'event-1',
          'title': 'Prayer Night',
          'slug': 'prayer-night',
          'category': 'PRAYER',
          'locationType': 'PHYSICAL',
          'startDateTime': '2026-07-01T18:00:00.000Z',
          'endDateTime': '2026-07-01T20:00:00.000Z',
          'registrationRequired': true,
          'attendeeCount': 2,
          'featured': false,
          'published': true,
        },
      },
    });
    expect(cancelResponse.event.userRsvpStatus, 'CANCELLED');
    expect(cancelResponse.event.attendeeCount, 2);
  });
}
