import 'dart:async';
import 'dart:isolate';
import 'dart:ui';

import 'package:flutter/material.dart';

import 'app.dart';
import 'core/auth/auth_provider.dart';
import 'core/auth/auth_scope.dart';
import 'core/firebase/crashlytics_bootstrap.dart';
import 'core/firebase/firebase_bootstrap.dart';
import 'core/notifications/services/firebase_messaging_service.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Firebase + Crashlytics are fail-open: never block startup.
    await FirebaseBootstrap.initialize();
    await CrashlyticsBootstrap.initialize();

    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      unawaited(CrashlyticsBootstrap.recordFlutterFatalError(details));
    };

    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      unawaited(
        CrashlyticsBootstrap.recordError(error, stack, fatal: true),
      );
      return true;
    };

    // Errors that escape the Flutter/Dart zone (isolate-level).
    Isolate.current.addErrorListener(
      RawReceivePort((dynamic pair) {
        final errorAndStacktrace = pair as List<dynamic>;
        unawaited(
          CrashlyticsBootstrap.recordError(
            errorAndStacktrace.first as Object,
            errorAndStacktrace.last as StackTrace?,
            fatal: true,
          ),
        );
      }).sendPort,
    );

    registerFirebaseMessagingBackgroundHandler();

    final authProvider = AuthProvider();
    await authProvider.bootstrap();

    runApp(
      AuthScope(
        notifier: authProvider,
        child: MinistryMobileApp(theme: AppTheme.lightTheme),
      ),
    );
  }, (Object error, StackTrace stack) {
    // Zone / async uncaught errors — never rethrow; app continues.
    unawaited(CrashlyticsBootstrap.recordError(error, stack, fatal: true));
  });
}
