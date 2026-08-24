import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/theme/theme_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('defaults to system and persists light/dark/system', () async {
    final prefs = await SharedPreferences.getInstance();
    final controller = ThemeController(preferences: prefs);

    expect(controller.themeMode, ThemeMode.system);

    await controller.setThemeMode(ThemeMode.dark);
    expect(controller.themeMode, ThemeMode.dark);
    expect(prefs.getString(ThemeController.storageKey), 'dark');

    await controller.setThemeMode(ThemeMode.light);
    expect(prefs.getString(ThemeController.storageKey), 'light');

    await controller.setThemeMode(ThemeMode.system);
    expect(prefs.getString(ThemeController.storageKey), 'system');
  });

  test('restores persisted theme mode on load', () async {
    SharedPreferences.setMockInitialValues({
      ThemeController.storageKey: 'dark',
    });
    final prefs = await SharedPreferences.getInstance();
    final controller = ThemeController(preferences: prefs);

    await controller.load();
    expect(controller.themeMode, ThemeMode.dark);
  });

  test('invalid stored value falls back to system', () {
    expect(ThemeController.decode('nope'), ThemeMode.system);
    expect(ThemeController.decode(null), ThemeMode.system);
    expect(ThemeController.encode(ThemeMode.light), 'light');
  });
}
