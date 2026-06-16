import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_logo.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              MinistryLogo(
                height: MinistryLogo.heroHeight,
                variant: MinistryLogoVariant.hero,
              ),
              const SizedBox(height: 16),
              Text(
                AppConstants.appName,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: AppColors.primaryPurple,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              CircularProgressIndicator(
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 12),
              Text(
                'Initializing session...',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
