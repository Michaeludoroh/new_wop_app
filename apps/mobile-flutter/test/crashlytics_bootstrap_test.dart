import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/firebase/crashlytics_bootstrap.dart';

void main() {
  setUp(() {
    CrashlyticsBootstrap.resetForTest();
  });

  test('record APIs are no-ops when Crashlytics is not initialized', () async {
    expect(CrashlyticsBootstrap.isInitialized, isFalse);
    expect(CrashlyticsBootstrap.isCollectionEnabled, isFalse);

    await CrashlyticsBootstrap.recordError(
      Exception('test'),
      StackTrace.current,
      fatal: true,
    );
    await CrashlyticsBootstrap.recordNonFatal(
      Exception('non-fatal'),
      StackTrace.current,
    );
    await CrashlyticsBootstrap.recordFlutterFatalError(
      FlutterErrorDetails(exception: Exception('flutter'), stack: StackTrace.current),
    );
    await CrashlyticsBootstrap.recordFlutterNonFatalError(
      FlutterErrorDetails(exception: Exception('flutter-nf'), stack: StackTrace.current),
    );

    expect(CrashlyticsBootstrap.isInitialized, isFalse);
  });

  test('initialize without Firebase does not throw and stays uninitialized', () async {
    await CrashlyticsBootstrap.initialize();
    expect(CrashlyticsBootstrap.isInitialized, isFalse);
    expect(CrashlyticsBootstrap.isCollectionEnabled, isFalse);
  });
}
