import 'package:flutter/material.dart';

import '../core/constants/app_assets.dart';
import '../core/theme/app_colors.dart';

/// Visual treatment for different logo placements.
enum MinistryLogoVariant {
  /// Compact logo for purple AppBars (subtle depth shadow).
  appBar,

  /// Default usage on cards and general content.
  standard,

  /// Splash and auth headers on light backgrounds.
  hero,
}

/// Ministry brand logo with responsive sizing and blended presentation.
class MinistryLogo extends StatelessWidget {
  const MinistryLogo({
    super.key,
    this.height = 72,
    this.variant = MinistryLogoVariant.standard,
    this.semanticLabel = 'WOP logo',
  });

  /// Logo height in logical pixels. Width scales with aspect ratio.
  final double height;

  final MinistryLogoVariant variant;

  final String semanticLabel;

  /// App bar logo height (28–36 per branding guidelines).
  static const double appBarHeight = 32;

  /// Splash and hero placements.
  static const double heroHeight = 88;

  /// Auth form header placement.
  static const double authFormHeight = 64;

  static const double _aspectRatio = 393 / 221;

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      AppAssets.logo,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      errorBuilder: (context, error, stackTrace) {
        return Icon(
          Icons.menu_book_rounded,
          size: height,
          color: Theme.of(context).colorScheme.primary,
        );
      },
    );

    final Widget styledLogo = switch (variant) {
      MinistryLogoVariant.appBar => DecoratedBox(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.28),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: image,
        ),
      MinistryLogoVariant.hero => Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.white.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.softGold.withValues(alpha: 0.45),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryPurple.withValues(alpha: 0.12),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: image,
        ),
      MinistryLogoVariant.standard => Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: AppColors.darkText.withValues(alpha: 0.06),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: image,
        ),
    };

    return Semantics(
      label: semanticLabel,
      image: true,
      child: SizedBox(
        height: height,
        width: height * _aspectRatio,
        child: FittedBox(
          fit: BoxFit.contain,
          child: styledLogo,
        ),
      ),
    );
  }
}
