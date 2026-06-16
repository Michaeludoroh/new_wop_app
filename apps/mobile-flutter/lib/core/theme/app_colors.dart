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
}
