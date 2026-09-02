import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/auth/token_storage_service.dart';
import 'package:ministry_mobile/core/notifications/push_notification_router.dart';
import 'package:ministry_mobile/core/notifications/services/fcm_token_registration.dart';
import 'package:ministry_mobile/core/notifications/services/firebase_messaging_service.dart';

class _MemoryTokenStorage extends TokenStorageService {
  String? accessToken = 'access-token';

  @override
  Future<String?> getAccessToken() async => accessToken;
}

Dio _recordingDio(List<RequestOptions> captured) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        captured.add(options);
        handler.resolve(
          Response<Map<String, dynamic>>(
            requestOptions: options,
            statusCode: 200,
            data: const <String, dynamic>{},
          ),
        );
      },
    ),
  );
  return dio;
}

FirebaseMessagingService _service({
  required List<RequestOptions> captured,
  required Future<AuthorizationStatus> Function() requestPermission,
  Future<String?> Function()? getApnsToken,
  Future<String?> Function()? getToken,
  bool isIos = false,
  Future<void> Function(Duration duration)? delay,
  TokenStorageService? tokenStorage,
  Future<void> Function()? setForegroundPresentation,
}) {
  return FirebaseMessagingService(
    dio: _recordingDio(captured),
    tokenStorageService: tokenStorage ?? _MemoryTokenStorage(),
    requestPermissionOverride: requestPermission,
    getApnsTokenOverride: getApnsToken,
    getTokenOverride: getToken,
    isIosOverride: isIos,
    delayOverride: delay ?? (_) async {},
    setForegroundPresentationOverride: setForegroundPresentation,
  );
}

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

  group('FirebaseMessagingService token registration', () {
    test('skips registration when notification permission is denied', () async {
      final captured = <RequestOptions>[];
      var getTokenCalls = 0;
      var apnsCalls = 0;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.denied,
        isIos: true,
        getApnsToken: () async {
          apnsCalls++;
          return 'apns-token';
        },
        getToken: () async {
          getTokenCalls++;
          return 'fcm-token';
        },
      );

      await service.registerCurrentToken();

      expect(captured, isEmpty);
      expect(getTokenCalls, 0);
      expect(apnsCalls, 0);
      await service.dispose();
    });

    test('registers FCM token on iOS after APNs token is available', () async {
      final captured = <RequestOptions>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: true,
        getApnsToken: () async => 'apns-token',
        getToken: () async => 'ios-fcm-token',
      );

      await service.registerCurrentToken();

      expect(captured, hasLength(1));
      expect(captured.single.path, '/push/device-token/register');
      expect(captured.single.data, containsPair('token', 'ios-fcm-token'));
      expect(captured.single.data, containsPair('platform', 'IOS'));
      await service.dispose();
    });

    test('retries when iOS APNs token is temporarily unavailable', () async {
      final captured = <RequestOptions>[];
      var apnsLookups = 0;
      final delays = <Duration>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: true,
        delay: (duration) async => delays.add(duration),
        getApnsToken: () async {
          apnsLookups++;
          if (apnsLookups < 3) return null;
          return 'apns-token';
        },
        getToken: () async => 'ios-fcm-token',
      );

      await service.registerCurrentToken();

      expect(apnsLookups, 3);
      expect(delays, hasLength(2));
      expect(captured, hasLength(1));
      expect(captured.single.data, containsPair('token', 'ios-fcm-token'));
      await service.dispose();
    });

    test('does not crash or register when iOS APNs retries are exhausted',
        () async {
      final captured = <RequestOptions>[];
      var apnsLookups = 0;
      var getTokenCalls = 0;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: true,
        getApnsToken: () async {
          apnsLookups++;
          return null;
        },
        getToken: () async {
          getTokenCalls++;
          return 'ios-fcm-token';
        },
      );

      await service.registerCurrentToken();

      expect(apnsLookups, FcmTokenRegistration.apnsMaxAttempts);
      expect(getTokenCalls, 0);
      expect(captured, isEmpty);
      await service.dispose();
    });

    test('registers Android FCM token without waiting for APNs', () async {
      final captured = <RequestOptions>[];
      var apnsLookups = 0;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getApnsToken: () async {
          apnsLookups++;
          return 'apns-token';
        },
        getToken: () async => 'android-fcm-token',
      );

      await service.registerCurrentToken();

      expect(apnsLookups, 0);
      expect(captured, hasLength(1));
      expect(captured.single.path, '/push/device-token/register');
      expect(captured.single.data, containsPair('token', 'android-fcm-token'));
      expect(captured.single.data, containsPair('platform', 'ANDROID'));
      await service.dispose();
    });

    test('refreshes a previously registered token via the refresh endpoint',
        () async {
      final captured = <RequestOptions>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getToken: () async => 'old-fcm-token',
      );

      await service.registerCurrentToken();
      await service.handleTokenRefreshForTesting('new-fcm-token');

      expect(captured, hasLength(2));
      expect(captured[0].path, '/push/device-token/register');
      expect(captured[1].path, '/push/device-token/refresh');
      expect(
        captured[1].data,
        containsPair('oldToken', 'old-fcm-token'),
      );
      expect(
        captured[1].data,
        containsPair('newToken', 'new-fcm-token'),
      );
      await service.dispose();
    });

    test('revokes the registered token on logout path', () async {
      final captured = <RequestOptions>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getToken: () async => 'android-fcm-token',
      );

      await service.registerCurrentToken();
      await service.revokeCurrentToken();

      expect(captured, hasLength(2));
      expect(captured[0].path, '/push/device-token/register');
      expect(captured[1].path, '/push/device-token/revoke');
      expect(captured[1].data, containsPair('token', 'android-fcm-token'));

      await service.revokeCurrentToken();
      expect(captured, hasLength(2));
      await service.dispose();
    });
  });

  group('FirebaseMessagingService foreground presentation', () {
    test('enables OS notification presentation before registering the token',
        () async {
      final captured = <RequestOptions>[];
      final order = <String>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: true,
        getApnsToken: () async => 'apns-token',
        getToken: () async {
          order.add('getToken');
          return 'ios-fcm-token';
        },
        setForegroundPresentation: () async => order.add('foregroundOptions'),
      );

      await service.runStartupSequenceForTesting();

      expect(order, ['foregroundOptions', 'getToken']);
      expect(captured, hasLength(1));
      expect(captured.single.path, '/push/device-token/register');
      await service.dispose();
    });
  });

  group('FirebaseMessagingService registration retry', () {
    test('registers on a later attempt once the APNs token becomes available',
        () async {
      final captured = <RequestOptions>[];
      var apnsAvailable = false;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: true,
        getApnsToken: () async => apnsAvailable ? 'apns-token' : null,
        getToken: () async => 'ios-fcm-token',
      );

      expect(await service.registerCurrentToken(), isFalse);
      expect(service.hasRegisteredToken, isFalse);
      expect(captured, isEmpty);

      apnsAvailable = true;
      await service.ensureTokenRegistered();

      expect(service.hasRegisteredToken, isTrue);
      expect(captured, hasLength(1));
      expect(captured.single.data, containsPair('token', 'ios-fcm-token'));
      await service.dispose();
    });

    test('registers on a later attempt once permission is granted', () async {
      final captured = <RequestOptions>[];
      var granted = false;
      final service = _service(
        captured: captured,
        requestPermission: () async =>
            granted ? AuthorizationStatus.authorized : AuthorizationStatus.denied,
        isIos: false,
        getToken: () async => 'android-fcm-token',
      );

      expect(await service.registerCurrentToken(), isFalse);
      expect(captured, isEmpty);

      granted = true;
      await service.ensureTokenRegistered();

      expect(service.hasRegisteredToken, isTrue);
      expect(captured, hasLength(1));
      await service.dispose();
    });

    test('defers registration until the user is authenticated', () async {
      final captured = <RequestOptions>[];
      final storage = _MemoryTokenStorage()..accessToken = null;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getToken: () async => 'android-fcm-token',
        tokenStorage: storage,
      );

      expect(await service.registerCurrentToken(), isFalse);
      expect(service.hasRegisteredToken, isFalse);
      expect(captured, isEmpty);

      storage.accessToken = 'access-token';
      await service.ensureTokenRegistered();

      expect(service.hasRegisteredToken, isTrue);
      expect(captured, hasLength(1));
      expect(captured.single.path, '/push/device-token/register');
      await service.dispose();
    });

    test('does not re-register once a token is already registered', () async {
      final captured = <RequestOptions>[];
      var getTokenCalls = 0;
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getToken: () async {
          getTokenCalls++;
          return 'android-fcm-token';
        },
      );

      expect(await service.registerCurrentToken(), isTrue);
      await service.ensureTokenRegistered();
      await service.ensureTokenRegistered();

      expect(getTokenCalls, 1);
      expect(captured, hasLength(1));
      await service.dispose();
    });

    test('does not duplicate registration for concurrent callers', () async {
      final captured = <RequestOptions>[];
      final service = _service(
        captured: captured,
        requestPermission: () async => AuthorizationStatus.authorized,
        isIos: false,
        getToken: () async => 'android-fcm-token',
      );

      await Future.wait([
        service.registerCurrentToken(),
        service.registerCurrentToken(),
        service.registerCurrentToken(),
      ]);

      expect(captured, hasLength(1));
      await service.dispose();
    });
  });
}
