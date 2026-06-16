import 'package:flutter/material.dart';

import '../core/subscriptions/subscription_models.dart';
import '../core/theme/app_colors.dart';

class MembershipStatusCard extends StatelessWidget {
  const MembershipStatusCard({
    super.key,
    required this.status,
  });

  final SubscriptionStatusModel? status;

  @override
  Widget build(BuildContext context) {
    final resolved = status;
    final plan = _planLabel(resolved?.plan ?? MembershipPlan.free);
    final state = resolved?.status ?? 'INACTIVE';
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Membership Status',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                if (resolved?.hasPremiumAccess ?? false)
                  const Chip(
                    label: Text(
                      'Premium',
                      style: TextStyle(
                        color: AppColors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    backgroundColor: AppColors.accentGold,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Plan: $plan'),
            Text('Status: $state'),
            if (resolved?.endDate != null)
              Text('Renews/ends: ${resolved!.endDate!.toLocal()}'),
            if (resolved?.isGracePeriod ?? false) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.softGold,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  resolved?.access?.daysRemainingInGrace != null
                      ? 'Payment issue detected. Premium access continues for ${resolved!.access!.daysRemainingInGrace} more day(s). Renew now to avoid interruption.'
                      : 'Payment issue detected. Renew now to keep premium access.',
                ),
              ),
            ] else if (resolved?.access?.renewalDue ?? false) ...[
              const SizedBox(height: 12),
              Text(
                'Your subscription period is ending soon.',
                style: theme.textTheme.bodyMedium,
              ),
            ] else if (!(resolved?.hasPremiumAccess ?? false)) ...[
              const SizedBox(height: 12),
              Text(
                'Upgrade to unlock premium eBooks and resources.',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _planLabel(MembershipPlan plan) {
    return switch (plan) {
      MembershipPlan.free => 'Free',
      MembershipPlan.premium => 'Premium',
      MembershipPlan.partner => 'Partner',
      MembershipPlan.unknown => 'Unknown',
    };
  }
}
