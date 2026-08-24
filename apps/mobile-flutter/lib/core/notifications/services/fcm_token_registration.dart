import 'package:firebase_messaging/firebase_messaging.dart';

/// Permission gate and bounded iOS APNs wait used before FCM [getToken].
///
/// Retry budget (iOS only):
/// - [apnsMaxAttempts] tries (first attempt is immediate)
/// - linear backoff of [apnsBackoffStepMs] × attempt number between failures
/// - maximum sleep: 4.5 seconds (300+600+900+1200+1500 ms)
abstract final class FcmTokenRegistration {
  static const int apnsMaxAttempts = 6;
  static const int apnsBackoffStepMs = 300;

  /// Total sleep across failed attempts 1–5. Does not include getAPNSToken time.
  static const int maxRetryWaitMs = apnsBackoffStepMs * 15;

  static Duration apnsBackoffForAttempt(int failedAttempt) {
    return Duration(milliseconds: apnsBackoffStepMs * failedAttempt);
  }

  static bool mayRegisterToken(AuthorizationStatus status) {
    return status == AuthorizationStatus.authorized ||
        status == AuthorizationStatus.provisional;
  }

  /// Returns a non-empty APNs token, or null after [maxAttempts] failures.
  ///
  /// Never loops unbounded. Lookup errors count as a failed attempt.
  static Future<String?> waitForApnsToken({
    required Future<String?> Function() getApnsToken,
    int maxAttempts = apnsMaxAttempts,
    Future<void> Function(Duration duration)? sleep,
  }) async {
    final delay = sleep ?? Future<void>.delayed;
    final attempts = maxAttempts < 1 ? 1 : maxAttempts;

    for (var attempt = 1; attempt <= attempts; attempt++) {
      try {
        final token = await getApnsToken();
        if (token != null && token.isNotEmpty) {
          return token;
        }
      } catch (_) {
        // Keep retrying within the bounded budget.
      }

      if (attempt < attempts) {
        await delay(apnsBackoffForAttempt(attempt));
      }
    }

    return null;
  }
}
