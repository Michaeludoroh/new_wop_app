import 'package:flutter/material.dart';

import 'app_colors.dart';

abstract final class AppTheme {
  static ThemeData get lightTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.primaryPurple,
      onPrimary: AppColors.white,
      primaryContainer: AppColors.lightPurple,
      onPrimaryContainer: AppColors.darkPurple,
      secondary: AppColors.accentGold,
      onSecondary: AppColors.darkText,
      secondaryContainer: AppColors.softGold,
      onSecondaryContainer: AppColors.darkText,
      tertiary: AppColors.softGold,
      onTertiary: AppColors.darkText,
      error: Color(0xFFB00020),
      onError: AppColors.white,
      surface: AppColors.white,
      onSurface: AppColors.darkText,
      onSurfaceVariant: AppColors.onSurfaceVariant,
      outline: AppColors.dividerGrey,
      surfaceContainerHighest: Color(0xFFF0F0F0),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.lightBackground,
      dividerColor: AppColors.dividerGrey,
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.primaryPurple,
        foregroundColor: AppColors.white,
        iconTheme: IconThemeData(color: AppColors.white),
        titleTextStyle: TextStyle(
          color: AppColors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 60,
        backgroundColor: AppColors.white,
        indicatorColor: AppColors.softGold,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 10,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? AppColors.primaryPurple : AppColors.unselectedGrey,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? AppColors.primaryPurple : AppColors.unselectedGrey,
            size: selected ? 22 : 20,
          );
        }),
      ),
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 1,
        shadowColor: AppColors.darkText.withValues(alpha: 0.08),
        surfaceTintColor: AppColors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primaryPurple,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryPurple,
          foregroundColor: AppColors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryPurple,
          side: const BorderSide(color: AppColors.primaryPurple),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryPurple,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.dividerGrey),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.dividerGrey),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryPurple, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFB00020)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFB00020), width: 2),
        ),
        labelStyle: const TextStyle(color: AppColors.onSurfaceVariant),
        floatingLabelStyle: const TextStyle(color: AppColors.primaryPurple),
      ),
      chipTheme: const ChipThemeData(
        backgroundColor: AppColors.softGold,
        labelStyle: TextStyle(
          color: AppColors.darkText,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        side: BorderSide.none,
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 0),
        shape: StadiumBorder(),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.dividerGrey,
        thickness: 1,
        space: 1,
      ),
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          color: AppColors.darkText,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: TextStyle(
          color: AppColors.darkText,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: TextStyle(
          color: AppColors.darkText,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: TextStyle(color: AppColors.darkText),
        bodyMedium: TextStyle(color: AppColors.darkText),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primaryPurple,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.darkPurple,
        contentTextStyle: const TextStyle(color: AppColors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  /// Gold-filled CTA for auth and premium highlights.
  static ButtonStyle get accentButtonStyle => FilledButton.styleFrom(
        backgroundColor: AppColors.accentGold,
        foregroundColor: AppColors.darkText,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      );

  static BoxDecoration get notificationBadgeDecoration => BoxDecoration(
        color: AppColors.accentGold,
        borderRadius: BorderRadius.circular(999),
      );

  static const TextStyle notificationBadgeTextStyle = TextStyle(
    color: AppColors.white,
    fontSize: 10,
    fontWeight: FontWeight.w700,
  );
}
