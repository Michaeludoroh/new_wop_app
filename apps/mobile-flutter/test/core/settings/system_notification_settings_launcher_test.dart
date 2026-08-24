import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/settings/system_notification_settings_launcher.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('wopp/system_settings');

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test('Android opens WOPP system notification settings via method channel',
      () async {
    MethodCall? captured;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      captured = call;
      return true;
    });

    final launcher = SystemNotificationSettingsLauncher(
      methodChannel: channel,
      isAndroidOverride: true,
    );

    expect(await launcher.open(), isTrue);
    expect(captured?.method, 'openNotificationSettings');
  });

  test('iOS opens WOPP app notification settings via app-settings', () async {
    Uri? launched;
    final launcher = SystemNotificationSettingsLauncher(
      isIOSOverride: true,
      launchUrlFn: (uri) async {
        launched = uri;
        return true;
      },
    );

    expect(await launcher.open(), isTrue);
    expect(launched, Uri.parse('app-settings:'));
  });

  test('Android launcher failure returns false without throwing', () async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      throw PlatformException(code: 'unavailable');
    });

    final launcher = SystemNotificationSettingsLauncher(
      methodChannel: channel,
      isAndroidOverride: true,
    );

    expect(await launcher.open(), isFalse);
  });

  test('iOS launcher failure returns false', () async {
    final launcher = SystemNotificationSettingsLauncher(
      isIOSOverride: true,
      launchUrlFn: (_) async => false,
    );

    expect(await launcher.open(), isFalse);
  });
}
