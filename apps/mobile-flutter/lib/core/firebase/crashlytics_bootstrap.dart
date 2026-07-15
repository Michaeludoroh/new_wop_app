import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

import '../logging/app_log.dart';

/// Fail-safe Firebase Crashlytics bootstrap.
///
/// Never throws. Never blocks startup. Collection is off in debug builds and
/// on in profile/release builds when Firebase is available.
abstract final class CrashlyticsBootstrap {
  static bool _initialized = false;

  /// True when Crashlytics was initialized successfully (may still have
  /// collection disabled in debug).
  static bool get isInitialized => _initialized;

  /// Whether crash reports will be sent (profile/release only).
  static bool get isCollectionEnabled => _initialized && !kDebugMode;

  /// Initialize Crashlytics after [Firebase.initializeApp].
  ///
  /// Safe to call when Firebase failed, is offline, or is unsupported —
  /// the app continues normally.
  static Future<void> initialize() async {
    try {
      if (kIsWeb) {
        AppLog.debug('Crashlytics skipped: unsupported on web.');
        return;
      }

      if (Firebase.apps.isEmpty) {
        AppLog.debug('Crashlytics skipped: Firebase not initialized.');
        return;
      }

      // Debug: never send. Profile + Release: send.
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(
        !kDebugMode,
      );

      _initialized = true;
      AppLog.debug(
        'Crashlytics ready (collection=${!kDebugMode}).',
      );
    } catch (error, stack) {
      _initialized = false;
      AppLog.debug('Crashlytics init failed (non-fatal): $error');
      AppLog.debug('$stack');
    }
  }

  /// Records a Flutter framework error (fatal).
  static Future<void> recordFlutterFatalError(
    FlutterErrorDetails details,
  ) async {
    try {
      if (!isCollectionEnabled) return;
      await FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    } catch (error) {
      AppLog.debug('Crashlytics.recordFlutterFatalError failed: $error');
    }
  }

  /// Records a Flutter framework error as non-fatal.
  static Future<void> recordFlutterNonFatalError(
    FlutterErrorDetails details,
  ) async {
    try {
      if (!isCollectionEnabled) return;
      await FirebaseCrashlytics.instance.recordFlutterError(details);
    } catch (error) {
      AppLog.debug('Crashlytics.recordFlutterNonFatalError failed: $error');
    }
  }

  /// Records an uncaught / zone / platform / isolate error.
  static Future<void> recordError(
    Object error,
    StackTrace? stack, {
    bool fatal = false,
    Iterable<Object> information = const [],
  }) async {
    try {
      if (!isCollectionEnabled) return;
      await FirebaseCrashlytics.instance.recordError(
        error,
        stack,
        fatal: fatal,
        information: information,
      );
    } catch (recordFailure) {
      AppLog.debug('Crashlytics.recordError failed: $recordFailure');
    }
  }

  /// Records a non-fatal exception (for intentional catch sites).
  static Future<void> recordNonFatal(
    Object error,
    StackTrace? stack, {
    Iterable<Object> information = const [],
  }) {
    return recordError(
      error,
      stack,
      fatal: false,
      information: information,
    );
  }

  /// Test helper to reset state without touching Firebase.
  @visibleForTesting
  static void resetForTest() {
    _initialized = false;
  }
}
