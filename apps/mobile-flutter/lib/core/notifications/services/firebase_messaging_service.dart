import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../../logging/app_log.dart';
import '../../auth/auth_service.dart';
import '../../auth/token_storage_service.dart';
import '../../firebase/firebase_bootstrap.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await FirebaseBootstrap.initialize();
}

/// Registers the FCM background isolate handler. Must run in [main] before
/// [runApp] (Firebase requirement).
void registerFirebaseMessagingBackgroundHandler() {
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
}

class FirebaseMessagingService {
  FirebaseMessagingService({
    FirebaseMessaging? messaging,
    Dio? dio,
    TokenStorageService? tokenStorageService,
  })  : _messagingOverride = messaging,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: AuthApiConfig.baseUrl,
                connectTimeout: const Duration(seconds: 15),
                receiveTimeout: const Duration(seconds: 20),
                sendTimeout: const Duration(seconds: 20),
                headers: {'Content-Type': 'application/json'},
              ),
            ),
        _tokenStorage = tokenStorageService ?? TokenStorageService();

  final FirebaseMessaging? _messagingOverride;
  final Dio _dio;
  final TokenStorageService _tokenStorage;
  final StreamController<RemoteMessage> _foregroundMessages =
      StreamController<RemoteMessage>.broadcast();
  final StreamController<RemoteMessage> _openedMessages =
      StreamController<RemoteMessage>.broadcast();

  Stream<RemoteMessage> get foregroundMessages => _foregroundMessages.stream;
  Stream<RemoteMessage> get openedMessages => _openedMessages.stream;

  /// Called when the dashboard (or other UI) has subscribed to [openedMessages].
  /// Flushes any cold-start notification tap buffered by [getInitialMessage].
  void markOpenedMessageListenersReady() {
    _openedMessageListenersReady = true;
    _deliverPendingColdStartMessageIfNeeded();
  }

  String? _registeredToken;
  bool _initialized = false;
  RemoteMessage? _pendingColdStartMessage;
  bool _openedMessageListenersReady = false;

  /// Resolves messaging only when Firebase is configured, avoiding test/runtime
  /// crashes from [FirebaseMessaging.instance] before [Firebase.initializeApp].
  FirebaseMessaging? get _messaging {
    if (_messagingOverride != null) {
      return _messagingOverride;
    }
    if (!FirebaseBootstrap.isConfigured) {
      return null;
    }
    return FirebaseMessaging.instance;
  }

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    await FirebaseBootstrap.initialize();
    if (!FirebaseBootstrap.isConfigured) {
      AppLog.debug('FCM initialization skipped: Firebase is not configured.');
      return;
    }

    final messaging = _messaging;
    if (messaging == null) {
      AppLog.debug('FCM initialization skipped: messaging unavailable.');
      return;
    }

    await messaging.requestPermission();
    await registerCurrentToken();

    FirebaseMessaging.onMessage.listen(_foregroundMessages.add);
    FirebaseMessaging.onMessageOpenedApp.listen(_openedMessages.add);

    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      _bufferColdStartMessage(initial);
    }

    messaging.onTokenRefresh.listen((newToken) async {
      final oldToken = _registeredToken;
      if (oldToken == null || oldToken.isEmpty) {
        await _registerToken(newToken);
        return;
      }
      await _refreshToken(oldToken: oldToken, newToken: newToken);
    });
  }

  Future<void> registerCurrentToken() async {
    try {
      final messaging = _messaging;
      if (messaging == null) return;

      final token = await messaging.getToken();
      if (token == null || token.isEmpty) return;
      await _registerToken(token);
    } catch (error) {
      AppLog.debug('FCM token registration skipped: $error');
    }
  }

  Future<void> revokeCurrentToken() async {
    final token = _registeredToken;
    if (token == null || token.isEmpty) return;
    try {
      await _authorizedPost('/push/device-token/revoke', {'token': token});
      _registeredToken = null;
    } catch (error) {
      AppLog.debug('FCM token revocation failed: $error');
    }
  }

  Future<void> dispose() async {
    await _foregroundMessages.close();
    await _openedMessages.close();
  }

  void _bufferColdStartMessage(RemoteMessage message) {
    _pendingColdStartMessage = message;
    _deliverPendingColdStartMessageIfNeeded();
  }

  void _deliverPendingColdStartMessageIfNeeded() {
    if (!_openedMessageListenersReady) {
      return;
    }
    final pending = _pendingColdStartMessage;
    if (pending == null) {
      return;
    }
    _pendingColdStartMessage = null;
    _openedMessages.add(pending);
  }

  /// Test hook for cold-start delivery without Firebase initialization.
  @visibleForTesting
  void stageColdStartMessageForTesting(RemoteMessage message) {
    _bufferColdStartMessage(message);
  }

  Future<void> _registerToken(String token) async {
    await _authorizedPost('/push/device-token/register', {
      'token': token,
      'platform': _platform,
      'deviceId': token.hashCode.toString(),
    });
    _registeredToken = token;
  }

  Future<void> _refreshToken({
    required String oldToken,
    required String newToken,
  }) async {
    await _authorizedPost('/push/device-token/refresh', {
      'oldToken': oldToken,
      'newToken': newToken,
      'platform': _platform,
      'deviceId': newToken.hashCode.toString(),
    });
    _registeredToken = newToken;
  }

  Future<void> _authorizedPost(String path, Object data) async {
    final accessToken = await _tokenStorage.getAccessToken();
    if (accessToken == null || accessToken.isEmpty) return;
    await _dio.post<dynamic>(
      path,
      data: data,
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }

  String get _platform {
    if (kIsWeb) return 'WEB';
    if (Platform.isIOS) return 'IOS';
    return 'ANDROID';
  }
}
