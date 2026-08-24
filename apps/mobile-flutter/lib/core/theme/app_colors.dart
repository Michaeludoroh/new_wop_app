import 'package:flutter/material.dart';

/// Ministry brand palette — use these constants instead of hard-coded colors.
abstract final class AppColors {
  static const Color primaryPurple = Color(0xFF6A1B9A);
  static const Color darkPurple = Color(0xFF4A148C);
  static const Color lightPurple = Color(0xFFE1BEE7);
  static const Color accentGold = Color(0xFFD4AF37);
  static const Color softGold = Color(0xFFF3E5AB);
  static const Color white = Color(0xFFFFFFFF);
  static const Color lightBackground = Color(0xFFFAFAFA);
  static const Color darkText = Color(0xFF212121);

  /// Navigation and secondary UI elements.
  static const Color unselectedGrey = Color(0xFF9E9E9E);
  static const Color dividerGrey = Color(0xFFE0E0E0);
  static const Color onSurfaceVariant = Color(0xFF616161);
  static const Color imagePlaceholder = dividerGrey;
  static const Color success = Color(0xFF2E7D32);

  /// Dark theme surfaces — purple-tinted, not a generic grey dark mode.
  static const Color darkBackground = Color(0xFF120C18);
  static const Color darkSurface = Color(0xFF1E1628);
  static const Color darkOnSurface = Color(0xFFF5F5F5);
  static const Color darkOnSurfaceVariant = Color(0xFFBDBDBD);
  static const Color darkDivider = Color(0xFF3D3450);
  static const Color darkInputFill = Color(0xFF2A2236);
}
