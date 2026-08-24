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
import 'core/theme/theme_controller.dart';
import 'core/theme/theme_scope.dart';

Future<void> main() async {
  debugPrint('[BOOT] Entering main()');
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Firebase + Crashlytics are fail-open: never block startup.
    debugPrint('[BOOT] before FirebaseBootstrap.initialize()');
    await FirebaseBootstrap.initialize();
    debugPrint('[BOOT] Firebase initialized');

    debugPrint('[BOOT] before CrashlyticsBootstrap.initialize()');
    await CrashlyticsBootstrap.initialize();
    debugPrint('[BOOT] after CrashlyticsBootstrap.initialize()');

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

    debugPrint('[BOOT] before creating AuthProvider');
    final authProvider = AuthProvider();
    debugPrint('[BOOT] before authProvider.bootstrap()');
    await authProvider.bootstrap();
    debugPrint('[BOOT] after authProvider.bootstrap()');

    final themeController = ThemeController();
    await themeController.load();

    debugPrint('[BOOT] runApp()');
    runApp(
      ThemeScope(
        notifier: themeController,
        child: AuthScope(
          notifier: authProvider,
          child: const MinistryMobileApp(),
        ),
      ),
    );
  }, (Object error, StackTrace stack) {
    // Zone / async uncaught errors — never rethrow; app continues.
    unawaited(CrashlyticsBootstrap.recordError(error, stack, fatal: true));
  });
}
