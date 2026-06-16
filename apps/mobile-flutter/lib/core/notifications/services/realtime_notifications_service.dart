import 'dart:convert';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../auth/token_storage_service.dart';

typedef RealtimeNotificationHandler = void Function(
    Map<String, dynamic> envelope);

class RealtimeNotificationsService {
  RealtimeNotificationsService({
    TokenStorageService? tokenStorageService,
  }) : _tokenStorage = tokenStorageService ?? TokenStorageService();

  final TokenStorageService _tokenStorage;

  io.Socket? _socket;
  bool _isRunning = false;

  Future<void> start({
    required RealtimeNotificationHandler onNotificationCreated,
    required RealtimeNotificationHandler onNotificationUpdated,
    required RealtimeNotificationHandler onNotificationReadStateChanged,
  }) async {
    if (_isRunning) return;
    final token = await _tokenStorage.getAccessToken();
    if (token == null || token.isEmpty) return;

    _isRunning = true;
    final socket = io.io(
      _resolveRealtimeUrl(),
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableReconnection()
          .setReconnectionAttempts(999999)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(10000)
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket.on('reconnect_attempt', (_) async {
      final freshToken = await _tokenStorage.getAccessToken();
      socket.auth = {'token': freshToken ?? '', 'reconnect': true};
    });

    socket.on('notification.created', (raw) {
      onNotificationCreated(parseEnvelope(raw));
    });
    socket.on('notification.updated', (raw) {
      onNotificationUpdated(parseEnvelope(raw));
    });
    socket.on('notification.read_state_changed', (raw) {
      onNotificationReadStateChanged(parseEnvelope(raw));
    });
    socket.on('announcement.published', (raw) {
      final envelope = parseEnvelope(raw);
      onNotificationCreated(envelope);
      onNotificationUpdated(envelope);
    });
    socket.on('realtime.error', (raw) {
      final envelope = parseEnvelope(raw);
      if (envelope['disconnect'] == true) {
        stop();
      }
    });

    _socket = socket;
    socket.connect();
  }

  Future<void> stop() async {
    _isRunning = false;
    _socket?.dispose();
    _socket = null;
  }

  String _resolveRealtimeUrl() {
    const env = String.fromEnvironment('API_BASE_URL',
        defaultValue: 'http://10.0.2.2:4000/api/v1');
    final trimmed = env.endsWith('/') ? env.substring(0, env.length - 1) : env;
    return trimmed.replaceFirst(RegExp(r'/api/v\d+$'), '/realtime');
  }

  Map<String, dynamic> parseEnvelope(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is String) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
      } catch (_) {
        return <String, dynamic>{};
      }
    }
    return <String, dynamic>{};
  }
}
