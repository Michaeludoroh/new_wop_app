import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/subscriptions/subscription_models.dart';
import '../core/subscriptions/subscription_provider.dart';
import '../core/subscriptions/subscription_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/membership_status_card.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/trial_banner.dart';
class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key, this.service});

  static const routeName = '/subscriptions';

  final SubscriptionService? service;

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  late final SubscriptionService _service = widget.service ?? SubscriptionService();
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String? _pendingProviderReference;
  SubscriptionStatusModel? _status;
  List<SubscriptionPlanModel> _plans = const [];

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getStatus(),
        _service.getPlans(),
      ]);
      if (!mounted) return;
      setState(() {
        _status = results[0] as SubscriptionStatusModel?;
        _plans = results[1] as List<SubscriptionPlanModel>;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load subscription status.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _subscribe(MembershipPlan plan) async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      if (plan == MembershipPlan.free) {
        await _service.subscribe(plan: plan);
        if (!mounted) return;
        await _loadStatus();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Free membership activated.')),
        );
        return;
      }

      final checkout = await _service.initiateCheckout(plan: plan);
      if (!mounted) return;
      _pendingProviderReference = checkout.providerReference;
      final launched = await launchUrl(
        Uri.parse(checkout.checkoutUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw Exception('Unable to open Flutterwave checkout');
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete checkout, then refresh payment status.')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Subscription update failed. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancelSubscription() async {
    setState(() => _submitting = true);
    try {
      await _service.cancel(immediate: false, reason: 'Cancelled from mobile app');
      if (!mounted) return;
      await _loadStatus();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription will cancel at period end.')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to cancel subscription.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _refreshPaymentStatus() async {
    final reference = _pendingProviderReference;
    if (reference == null || reference.isEmpty) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final status = await _service.getPaymentStatus(reference);
      if (!mounted) return;
      if (status.isSuccessful) {
        await _loadStatus();
        SubscriptionScope.maybeOf(context)?.refresh();
        if (!mounted) return;
        setState(() => _pendingProviderReference = null);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment verified. Subscription activated.')),
        );
      } else if (status.isFailed) {
        setState(() {
          _error = status.failureMessage ?? 'Payment failed. You can try checkout again.';
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment is still pending.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to refresh payment status.';
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final canRenew = status?.isGracePeriod == true || status?.access?.renewalDue == true;

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Subscription'),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadStatus,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    MembershipStatusCard(status: status),
                    const SizedBox(height: 16),
                    if (_error != null) ...[
                      Card(
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(_error!),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (_pendingProviderReference != null) ...[
                      Card(
                        child: ListTile(
                          title: const Text('Checkout pending'),
                          subtitle: Text(_pendingProviderReference!),
                          trailing: FilledButton(
                            onPressed: _submitting ? null : _refreshPaymentStatus,
                            child: const Text('Refresh status'),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (status?.hasPremiumAccess ?? false) ...[
                      OutlinedButton(
                        onPressed: _submitting ? null : _cancelSubscription,
                        child: const Text('Cancel at period end'),
                      ),
                      const SizedBox(height: 16),
                    ],
                    Text(
                      canRenew ? 'Renew Membership' : 'Premium Membership',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                    const SizedBox(height: 12),
                    _PremiumMembershipCard(
                      submitting: _submitting,
                      onSubscribe: () => _subscribe(MembershipPlan.premium),
                      plan: _premiumPlan,
                    ),
                    if (_plans.any((plan) => plan.code.toUpperCase() == 'FREE')) ...[
                      const SizedBox(height: 16),
                      _PlanTile(
                        title: 'Free',
                        subtitle: 'Access free eBooks only.',
                        onTap: _submitting ? null : () => _subscribe(MembershipPlan.free),
                      ),
                    ],
                    if (_plans.length > 1)
                      ..._plans
                          .where((plan) => !plan.code.toUpperCase().contains('PREMIUM'))
                          .map(
                            (plan) => Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: _PlanTile(
                                title: plan.name,
                                subtitle: _formatPlanPrice(plan),
                                onTap: _submitting
                                    ? null
                                    : () => _subscribe(_planFromCode(plan.code)),
                              ),
                            ),
                          ),
                    if (_plans.isEmpty) ...[
                      const SizedBox(height: 12),
                      _PlanTile(
                        title: 'Premium Membership',
                        subtitle: '₦500 / Month',
                        onTap: _submitting ? null : () => _subscribe(MembershipPlan.premium),
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  MembershipPlan _planFromCode(String code) {
    final normalized = code.toUpperCase();
    if (normalized.contains('FREE')) return MembershipPlan.free;
    if (normalized.contains('PARTNER')) return MembershipPlan.partner;
    if (normalized.contains('PREMIUM') || normalized.contains('BASIC')) {
      return MembershipPlan.premium;
    }
    return MembershipPlan.unknown;
  }

  SubscriptionPlanModel? get _premiumPlan {
    for (final plan in _plans) {
      if (plan.code.toUpperCase().contains('PREMIUM')) {
        return plan;
      }
    }
    return null;
  }

  String _formatPlanPrice(SubscriptionPlanModel plan) {
    final currency = plan.code.toUpperCase().contains('PREMIUM') ? '₦' : '\$';
    return '${plan.billingInterval} • $currency${plan.amount.toStringAsFixed(0)}';
  }
}

class _PremiumMembershipCard extends StatelessWidget {
  const _PremiumMembershipCard({
    required this.submitting,
    required this.onSubscribe,
    this.plan,
  });

  final bool submitting;
  final VoidCallback onSubscribe;
  final SubscriptionPlanModel? plan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final amount = plan?.amount ?? 500;
    final currencySymbol = plan == null || plan!.amount >= 100 ? '₦' : '\$';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              plan?.name ?? 'Premium Membership',
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$currencySymbol${amount.toStringAsFixed(0)} / Month',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            Text('Benefits', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            const _BenefitLine(text: 'Daily devotionals'),
            const _BenefitLine(text: 'Premium messages'),
            const _BenefitLine(text: 'Video library'),
            const _BenefitLine(text: 'Live events'),
            const _BenefitLine(text: 'Member-only resources'),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: submitting ? null : onSubscribe,
                child: const Text('Subscribe Now'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BenefitLine extends StatelessWidget {
  const _BenefitLine({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isPremium = title.toLowerCase().contains('premium') ||
        title.toLowerCase().contains('partner');

    return Card(
      child: ListTile(
        title: Row(
          children: [
            Expanded(child: Text(title)),
            if (isPremium)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.accentGold,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Premium',
                  style: TextStyle(
                    color: AppColors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
          ],
        ),
        subtitle: Text(subtitle),
        trailing: Icon(
          Icons.chevron_right,
          color: Theme.of(context).colorScheme.primary,
        ),
        onTap: onTap,
      ),
    );
  }
}
