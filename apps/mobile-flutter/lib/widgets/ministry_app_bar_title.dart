import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import 'ministry_logo.dart';

/// Branded AppBar title: logo plus screen or app name.
class MinistryAppBarTitle extends StatelessWidget {
  const MinistryAppBarTitle({
    super.key,
    this.title,
    this.logoHeight = MinistryLogo.appBarHeight,
  }) : assert(
          logoHeight >= 28 && logoHeight <= 36,
          'App bar logo height must be between 28 and 36',
        );

  /// When null, shows [AppConstants.appName].
  final String? title;

  final double logoHeight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final label = title ?? AppConstants.appName;
    final textStyle = theme.appBarTheme.titleTextStyle ??
        theme.textTheme.titleLarge?.copyWith(
          color: theme.appBarTheme.foregroundColor,
        );

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          MinistryLogo(
            height: logoHeight,
            variant: MinistryLogoVariant.appBar,
          ),
          const SizedBox(width: 10),
          Text(
            label,
            style: textStyle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
