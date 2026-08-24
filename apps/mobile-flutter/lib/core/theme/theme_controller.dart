import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists [ThemeMode] locally. Does not replace [AuthProvider] / [AuthScope].
class ThemeController extends ChangeNotifier {
  ThemeController({SharedPreferences? preferences})
      : _preferencesOverride = preferences;

  static const storageKey = 'settings.theme_mode';

  final SharedPreferences? _preferencesOverride;
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;

  Future<SharedPreferences> _prefs() async {
    final override = _preferencesOverride;
    if (override != null) {
      return override;
    }
    return SharedPreferences.getInstance();
  }

  static ThemeMode decode(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  static String encode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  Future<void> load() async {
    final prefs = await _prefs();
    _themeMode = decode(prefs.getString(storageKey));
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_themeMode == mode) return;
    _themeMode = mode;
    notifyListeners();
    final prefs = await _prefs();
    await prefs.setString(storageKey, encode(mode));
  }
}
