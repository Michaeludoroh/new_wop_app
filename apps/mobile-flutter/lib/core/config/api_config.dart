import 'package:flutter/foundation.dart';

/// Resolves API endpoints for mobile builds.
///
/// Release and profile builds must pass `--dart-define=API_BASE_URL=...`.
/// Debug builds fall back to the Android emulator loopback host.
abstract final class ApiConfig {
  static const String _envApiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _devDefaultApiBaseUrl = 'http://10.0.2.2:3000/api/v1';

  static String get apiBaseUrl {
    final configured = _envApiBaseUrl.trim();
    if (configured.isNotEmpty) {
      return configured;
    }
    if (kDebugMode) {
      return _devDefaultApiBaseUrl;
    }
    throw StateError(
      'API_BASE_URL must be set via --dart-define for release/profile builds. '
      'Example: --dart-define=API_BASE_URL=https://woppandmopp.com/api/v1',
    );
  }

  static String get realtimeBaseUrl {
    final trimmed =
        apiBaseUrl.endsWith('/') ? apiBaseUrl.substring(0, apiBaseUrl.length - 1) : apiBaseUrl;
    return trimmed.replaceFirst(RegExp(r'/api/v\d+$'), '/realtime');
  }
}
