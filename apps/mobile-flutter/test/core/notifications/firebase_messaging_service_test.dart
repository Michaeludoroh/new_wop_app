import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/notifications/push_notification_router.dart';
import 'package:ministry_mobile/core/notifications/services/firebase_messaging_service.dart';

void main() {
  group('FirebaseMessagingService cold-start buffering', () {
    late FirebaseMessagingService service;

    setUp(() {
      service = FirebaseMessagingService();
    });

    tearDown(() async {
      await service.dispose();
    });

    test('buffers cold-start tap until opened-message listeners are ready', () async {
      const message = RemoteMessage(
        data: {
          'entityType': 'EVENT',
          'entityId': 'event-1',
        },
      );

      final received = <RemoteMessage>[];
      service.openedMessages.listen(received.add);

      service.stageColdStartMessageForTesting(message);
      await Future<void>.delayed(Duration.zero);

      expect(received, isEmpty);

      service.markOpenedMessageListenersReady();
      await Future<void>.delayed(Duration.zero);

      expect(received, hasLength(1));
      expect(
        PushNotificationRouter.resolveRoute(received.first.data)?.name,
        '/events/details',
      );
    });

    test('delivers cold-start tap immediately when listeners are already ready',
        () async {
      const message = RemoteMessage(
        data: {
          'entityType': 'LIBRARY',
          'route': '/library',
        },
      );

      final received = <RemoteMessage>[];
      service.openedMessages.listen(received.add);
      service.markOpenedMessageListenersReady();

      service.stageColdStartMessageForTesting(message);
      await Future<void>.delayed(Duration.zero);

      expect(received, hasLength(1));
      expect(
        PushNotificationRouter.resolveRoute(received.first.data)?.name,
        '/library',
      );
    });

    test('delivers buffered cold-start tap only once', () async {
      const message = RemoteMessage(
        data: {
          'notificationId': 'notif-1',
        },
      );

      final received = <RemoteMessage>[];
      service.openedMessages.listen(received.add);

      service.stageColdStartMessageForTesting(message);
      service.markOpenedMessageListenersReady();
      service.markOpenedMessageListenersReady();
      await Future<void>.delayed(Duration.zero);

      expect(received, hasLength(1));
    });
  });
}
