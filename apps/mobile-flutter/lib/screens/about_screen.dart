import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/ministry_logo.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  static const routeName = '/about';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'About WOP'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        children: [
          Center(
            child: MinistryLogo(
              height: MinistryLogo.heroHeight,
              variant: MinistryLogoVariant.hero,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            AppConstants.appName,
            style: theme.textTheme.headlineMedium?.copyWith(
              color: AppColors.primaryPurple,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          _BrandingCard(
            child: Column(
              children: [
                Text(
                  'Powered by',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.onSurfaceVariant,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  AppConstants.organizationName,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: AppColors.accentGold,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                Container(
                  height: 1,
                  width: 48,
                  color: AppColors.accentGold.withValues(alpha: 0.6),
                ),
                const SizedBox(height: 20),
                Text(
                  'Developed by:',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  AppConstants.developersDisplay,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: AppColors.primaryPurple,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _BrandingCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'App Information',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: AppColors.primaryPurple,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                _InfoRow(
                  label: 'Version',
                  value: AppConstants.appVersion,
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Build',
                  value: AppConstants.buildNumber,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            AppConstants.copyrightNotice,
            style: theme.textTheme.bodySmall?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _BrandingCard extends StatelessWidget {
  const _BrandingCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.lightPurple.withValues(alpha: 0.8),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryPurple.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.darkText,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
