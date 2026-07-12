import 'package:flutter/foundation.dart';

/// Debug-only logging helper. Never emits output in release builds.
abstract final class AppLog {
  static void debug(String message) {
    if (kDebugMode) {
      debugPrint(message);
    }
  }
}
