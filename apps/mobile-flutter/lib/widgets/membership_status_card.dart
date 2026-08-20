import 'package:flutter/material.dart';

import '../core/subscriptions/subscription_models.dart';
import '../core/subscriptions/trial_manager.dart';
import '../core/theme/app_colors.dart';
import '../screens/subscription_screen.dart';

class MembershipStatusCard extends StatelessWidget {
  const MembershipStatusCard({
    super.key,
    required this.status,
    this.showManageAction = false,
  });

  final SubscriptionStatusModel? status;
  final bool showManageAction;

  @override
  Widget build(BuildContext context) {
    final resolved = status;
    final theme = Theme.of(context);
    final trial = TrialManager.isTrialActive(resolved);
    final premium = TrialManager.hasPremiumAccess(resolved);
    final remainingDays = TrialManager.remainingTrialDays(resolved);
    final statusLabel = _statusLabel(resolved, trial: trial, premium: premium);

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
                    'WOPP Premium',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (premium)
                  const Chip(
                    label: Text(
                      'Active',
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
            Text('Status: $statusLabel'),
            if (trial && remainingDays != null)
              Text(
                remainingDays == 1
                    ? '1 day remaining'
                    : '$remainingDays days remaining',
              )
            else if (resolved?.endDate != null)
              Text(_expiryLabel(resolved!)),
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
                      ? 'Payment issue detected. WOPP Premium continues for ${resolved!.access!.daysRemainingInGrace} more day(s). Renew now to avoid interruption.'
                      : 'Payment issue detected. Renew now to keep WOPP Premium access.',
                ),
              ),
            ],
            if (showManageAction) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pushNamed(
                    SubscriptionScreen.routeName,
                  ),
                  child: Text(premium ? 'Manage subscription' : 'Subscribe'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _statusLabel(
    SubscriptionStatusModel? status, {
    required bool trial,
    required bool premium,
  }) {
    if (trial) return 'Free Trial';
    if (status?.isGracePeriod ?? false) return 'Grace period';
    if (premium) return 'Active';
    final raw = status?.status.toUpperCase();
    if (raw == null || raw.isEmpty || raw == 'INACTIVE') {
      return 'Inactive';
    }
    if (raw == 'EXPIRED' || raw == 'CANCELLED') {
      return raw[0] + raw.substring(1).toLowerCase();
    }
    return raw[0] + raw.substring(1).toLowerCase();
  }

  String _expiryLabel(SubscriptionStatusModel status) {
    final expiry = status.endDate!.toLocal();
    final date =
        '${expiry.day.toString().padLeft(2, '0')}/${expiry.month.toString().padLeft(2, '0')}/${expiry.year}';
    if (status.cancelAtPeriodEnd) {
      return 'Ends: $date';
    }
    return 'Renews/ends: $date';
  }
}
