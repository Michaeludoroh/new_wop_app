import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/theme/app_colors.dart';
import 'package:ministry_mobile/core/theme/app_theme.dart';

void main() {
  test('light theme keeps WOPP purple/gold Material 3 branding', () {
    final theme = AppTheme.lightTheme;
    expect(theme.useMaterial3, isTrue);
    expect(theme.brightness, Brightness.light);
    expect(theme.colorScheme.primary, AppColors.primaryPurple);
    expect(theme.colorScheme.secondary, AppColors.accentGold);
  });

  test('light theme semantic colors stay on the original WOPP light palette', () {
    final scheme = AppTheme.lightTheme.colorScheme;
    expect(scheme.surface, AppColors.white);
    expect(scheme.onSurface, AppColors.darkText);
    expect(scheme.onSurfaceVariant, AppColors.onSurfaceVariant);
    expect(scheme.outline, AppColors.dividerGrey);
    expect(scheme.primaryContainer, AppColors.lightPurple);
    expect(AppTheme.lightTheme.scaffoldBackgroundColor, AppColors.lightBackground);
  });
  test('dark theme exists and keeps WOPP purple/gold branding', () {
    final theme = AppTheme.darkTheme;
    expect(theme.useMaterial3, isTrue);
    expect(theme.brightness, Brightness.dark);
    expect(theme.colorScheme.primary, AppColors.primaryPurple);
    expect(theme.colorScheme.secondary, AppColors.accentGold);
    expect(theme.scaffoldBackgroundColor, AppColors.darkBackground);
  });
}
