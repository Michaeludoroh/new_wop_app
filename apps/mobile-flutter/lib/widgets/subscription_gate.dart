import 'package:flutter/material.dart';

import '../core/subscriptions/subscription_provider.dart';
import '../core/subscriptions/trial_manager.dart';
import '../screens/subscription_screen.dart';
import 'trial_banner.dart';

class SubscriptionGate extends StatelessWidget {
  const SubscriptionGate({
    super.key,
    required this.child,
    this.loading,
  });

  final Widget child;
  final Widget? loading;

  @override
  Widget build(BuildContext context) {
    final provider = SubscriptionScope.maybeOf(context);
    final status = provider?.status;

    if (provider?.loading == true && status == null) {
      return loading ??
          const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
    }

    if (TrialManager.shouldGatePremiumContent(status)) {
      return const SubscriptionRequiredScreen();
    }

    return child;
  }
}

class SubscriptionRequiredScreen extends StatelessWidget {
  const SubscriptionRequiredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription Required')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                Icons.lock_outline,
                size: 72,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Subscription Required',
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Your free trial has ended. Subscribe for only ₦500/month to continue using WOPP premium content.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge,
              ),
              const Spacer(),
              FilledButton(
                onPressed: () =>
                    Navigator.of(context).pushNamed(SubscriptionScreen.routeName),
                child: const Text('View Subscription Plans'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(context).maybePop(),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
