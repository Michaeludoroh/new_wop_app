import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/settings/system_notification_settings_launcher.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';
import 'package:ministry_mobile/screens/notification_settings_screen.dart';

class _RecordingLauncher extends SystemNotificationSettingsLauncher {
  int calls = 0;
  bool result = true;

  @override
  Future<bool> open() async {
    calls += 1;
    return result;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpScreen(
    WidgetTester tester, {
    required SystemNotificationSettingsLauncher launcher,
    ThemeMode themeMode = ThemeMode.light,
  }) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: themeMode,
        home: NotificationSettingsScreen(
          notificationSettingsLauncher: launcher,
        ),
      ),
    );
  }

  testWidgets('renders notification preferences copy', (tester) async {
    await pumpScreen(tester, launcher: _RecordingLauncher());

    expect(find.text('Notification Preferences'), findsOneWidget);
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Push Notifications'), findsOneWidget);
    expect(find.text('Open device notification settings'), findsOneWidget);
    expect(
      find.text('Control whether WOPP can send notifications to your device.'),
      findsOneWidget,
    );
  });

  testWidgets('push notifications opens the existing device settings launcher',
      (tester) async {
    final launcher = _RecordingLauncher();
    await pumpScreen(tester, launcher: launcher);

    await tester.tap(find.byKey(const Key('notification_settings_open_device_tile')));
    await tester.pump();

    expect(launcher.calls, 1);
    expect(
      find.text('Open your device Settings, then Notifications, then WOPP.'),
      findsNothing,
    );
  });

  testWidgets('shows fallback guidance when the launcher cannot open settings',
      (tester) async {
    final launcher = _RecordingLauncher()..result = false;
    await pumpScreen(tester, launcher: launcher);

    await tester.tap(find.byKey(const Key('notification_settings_open_device_tile')));
    await tester.pump();

    expect(launcher.calls, 1);
    expect(
      find.text('Open your device Settings, then Notifications, then WOPP.'),
      findsOneWidget,
    );
  });
}
