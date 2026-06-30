import 'package:flutter/material.dart';

import '../core/subscriptions/subscription_provider.dart';
import '../core/subscriptions/trial_manager.dart';
import '../core/theme/app_colors.dart';
import '../screens/subscription_screen.dart';

class SubscriptionScope extends InheritedNotifier<SubscriptionProvider> {
  const SubscriptionScope({
    super.key,
    required SubscriptionProvider notifier,
    required super.child,
  }) : super(notifier: notifier);

  static SubscriptionProvider of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SubscriptionScope>();
    assert(scope != null, 'SubscriptionScope not found in widget tree');
    return scope!.notifier!;
  }

  static SubscriptionProvider? maybeOf(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SubscriptionScope>();
    return scope?.notifier;
  }
}

class TrialBanner extends StatelessWidget {
  const TrialBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = SubscriptionScope.maybeOf(context);
    final status = provider?.status;

    if (!TrialManager.showTrialBanner(status)) {
      return const SizedBox.shrink();
    }

    final isTrial = TrialManager.isTrialActive(status);
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      color: isTrial ? AppColors.softGold : theme.colorScheme.errorContainer,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).pushNamed(SubscriptionScreen.routeName),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isTrial ? '🎉 ${TrialManager.bannerTitle(status)!}' : TrialManager.bannerTitle(status)!,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(TrialManager.bannerMessage(status)),
            ],
          ),
        ),
      ),
    );
  }
}
