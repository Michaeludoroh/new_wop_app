import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/notifications/push_notification_router.dart';

void main() {
  group('PushNotificationRouter', () {
    test('routes notificationId payloads to notifications screen', () {
      final route = PushNotificationRouter.resolveRoute({
        'notificationId': 'notif-1',
        'channel': 'PUSH',
      });

      expect(route?.name, '/notifications');
    });

    test('routes explicit route payloads', () {
      final route = PushNotificationRouter.resolveRoute({
        'route': '/subscriptions',
      });

      expect(route?.name, '/subscriptions');
    });

    test(
        'prefers entityType and entityId over explicit route for detail screens',
        () {
      final route = PushNotificationRouter.resolveRoute({
        'entityType': 'ANNOUNCEMENT',
        'entityId': 'ann-1',
        'route': '/announcements/details',
      });

      expect(route?.name, '/announcements/details');
      expect(route?.arguments, 'ann-1');
    });

    test('routes module entity types to detail screens', () {
      final cases = <Map<String, String>, String>{
        {'entityType': 'EVENT', 'entityId': 'event-1'}: '/events/details',
        {'entityType': 'PROGRAM', 'entityId': 'program-1'}: '/programs/details',
        {'entityType': 'MENTORSHIP', 'entityId': 'class-1'}:
            '/mentorship/details',
        {'entityType': 'ANNOUNCEMENT', 'entityId': 'ann-1'}:
            '/announcements/details',
        {'entityType': 'EBOOK', 'entityId': 'ebook-1'}: '/ebooks/details',
      };

      for (final entry in cases.entries) {
        final route = PushNotificationRouter.resolveRoute(entry.key);
        expect(route?.name, entry.value, reason: entry.key.toString());
        expect(route?.arguments, entry.key['entityId']);
      }
    });

    test('routes LIBRARY entityType to library screen', () {
      final route = PushNotificationRouter.resolveRoute({
        'entityType': 'LIBRARY',
        'route': '/library',
      });

      expect(route?.name, '/library');
      expect(route?.arguments, isNull);
    });
  });

  group('FirebaseMessagingService streams', () {
    test('foreground and opened message streams accept RemoteMessage payloads',
        () async {
      const message = RemoteMessage(
        data: {
          'notificationId': 'notif-1',
          'category': 'NOTIFICATION',
        },
      );

      final route = PushNotificationRouter.resolveRoute(message.data);
      expect(route?.name, '/notifications');
    });

    test('background and opened payloads deep-link to module content', () {
      const message = RemoteMessage(
        data: {
          'entityType': 'PROGRAM',
          'entityId': 'program-1',
          'route': '/programs/details',
        },
      );

      final route = PushNotificationRouter.resolveRoute(message.data);
      expect(route?.name, '/programs/details');
      expect(route?.arguments, 'program-1');
    });
  });
}
