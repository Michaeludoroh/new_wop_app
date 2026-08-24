import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/notifications/services/fcm_token_registration.dart';

void main() {
  group('FcmTokenRegistration.mayRegisterToken', () {
    test('allows authorized and provisional statuses', () {
      expect(
        FcmTokenRegistration.mayRegisterToken(AuthorizationStatus.authorized),
        isTrue,
      );
      expect(
        FcmTokenRegistration.mayRegisterToken(AuthorizationStatus.provisional),
        isTrue,
      );
    });

    test('skips denied and notDetermined statuses', () {
      expect(
        FcmTokenRegistration.mayRegisterToken(AuthorizationStatus.denied),
        isFalse,
      );
      expect(
        FcmTokenRegistration.mayRegisterToken(
          AuthorizationStatus.notDetermined,
        ),
        isFalse,
      );
    });
  });

  group('FcmTokenRegistration.waitForApnsToken', () {
    test('returns immediately when APNs token is already available', () async {
      var lookups = 0;
      final delays = <Duration>[];

      final token = await FcmTokenRegistration.waitForApnsToken(
        getApnsToken: () async {
          lookups++;
          return 'apns-token';
        },
        sleep: (duration) async => delays.add(duration),
      );

      expect(token, 'apns-token');
      expect(lookups, 1);
      expect(delays, isEmpty);
    });

    test('retries with bounded backoff until APNs token appears', () async {
      var lookups = 0;
      final delays = <Duration>[];

      final token = await FcmTokenRegistration.waitForApnsToken(
        getApnsToken: () async {
          lookups++;
          if (lookups < 3) return null;
          return 'apns-after-retry';
        },
        sleep: (duration) async => delays.add(duration),
      );

      expect(token, 'apns-after-retry');
      expect(lookups, 3);
      expect(delays, [
        FcmTokenRegistration.apnsBackoffForAttempt(1),
        FcmTokenRegistration.apnsBackoffForAttempt(2),
      ]);
    });

    test('stops after max attempts without looping forever', () async {
      var lookups = 0;
      final delays = <Duration>[];

      final token = await FcmTokenRegistration.waitForApnsToken(
        getApnsToken: () async {
          lookups++;
          return null;
        },
        sleep: (duration) async => delays.add(duration),
      );

      expect(token, isNull);
      expect(lookups, FcmTokenRegistration.apnsMaxAttempts);
      expect(delays, hasLength(FcmTokenRegistration.apnsMaxAttempts - 1));
      expect(
        delays.fold<int>(0, (sum, item) => sum + item.inMilliseconds),
        FcmTokenRegistration.maxRetryWaitMs,
      );
    });

    test('treats lookup errors as failed attempts and still terminates',
        () async {
      var lookups = 0;

      final token = await FcmTokenRegistration.waitForApnsToken(
        getApnsToken: () async {
          lookups++;
          throw StateError('APNs not ready');
        },
        sleep: (_) async {},
      );

      expect(token, isNull);
      expect(lookups, FcmTokenRegistration.apnsMaxAttempts);
    });
  });
}
