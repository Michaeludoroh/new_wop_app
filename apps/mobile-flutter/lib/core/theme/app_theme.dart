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

    return _build(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.lightBackground,
      navigationBackground: AppColors.white,
      cardColor: AppColors.white,
      cardTint: AppColors.white,
      inputFill: AppColors.white,
      dividerColor: AppColors.dividerGrey,
      unselectedNav: AppColors.unselectedGrey,
      textColor: AppColors.darkText,
      snackBarBackground: AppColors.darkPurple,
    );
  }

  static ThemeData get darkTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.primaryPurple,
      onPrimary: AppColors.white,
      primaryContainer: AppColors.darkPurple,
      onPrimaryContainer: AppColors.lightPurple,
      secondary: AppColors.accentGold,
      onSecondary: AppColors.darkText,
      secondaryContainer: Color(0xFF4A3A12),
      onSecondaryContainer: AppColors.softGold,
      tertiary: AppColors.softGold,
      onTertiary: AppColors.darkText,
      error: Color(0xFFEF9A9A),
      onError: AppColors.darkText,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkOnSurface,
      onSurfaceVariant: AppColors.darkOnSurfaceVariant,
      outline: AppColors.darkDivider,
      surfaceContainerHighest: AppColors.darkInputFill,
    );

    return _build(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.darkBackground,
      navigationBackground: AppColors.darkSurface,
      cardColor: AppColors.darkSurface,
      cardTint: AppColors.darkSurface,
      inputFill: AppColors.darkInputFill,
      dividerColor: AppColors.darkDivider,
      unselectedNav: AppColors.unselectedGrey,
      textColor: AppColors.darkOnSurface,
      snackBarBackground: AppColors.darkPurple,
    );
  }

  static ThemeData _build({
    required ColorScheme colorScheme,
    required Color scaffoldBackgroundColor,
    required Color navigationBackground,
    required Color cardColor,
    required Color cardTint,
    required Color inputFill,
    required Color dividerColor,
    required Color unselectedNav,
    required Color textColor,
    required Color snackBarBackground,
  }) {
    return ThemeData(
      useMaterial3: true,
      brightness: colorScheme.brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: scaffoldBackgroundColor,
      dividerColor: dividerColor,
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
        backgroundColor: navigationBackground,
        indicatorColor: AppColors.softGold,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 10,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? AppColors.primaryPurple : unselectedNav,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? AppColors.primaryPurple : unselectedNav,
            size: selected ? 22 : 20,
          );
        }),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 1,
        shadowColor: AppColors.darkText.withValues(alpha: 0.08),
        surfaceTintColor: cardTint,
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
        fillColor: inputFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: dividerColor),
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
        labelStyle: TextStyle(color: colorScheme.onSurfaceVariant),
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
      dividerTheme: DividerThemeData(
        color: dividerColor,
        thickness: 1,
        space: 1,
      ),
      textTheme: TextTheme(
        headlineSmall: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: TextStyle(color: textColor),
        bodyMedium: TextStyle(color: textColor),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primaryPurple,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: snackBarBackground,
        contentTextStyle: const TextStyle(color: AppColors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppColors.primaryPurple;
          }
          return colorScheme.onSurfaceVariant;
        }),
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
