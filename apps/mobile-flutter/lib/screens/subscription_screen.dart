import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/subscriptions/subscription_models.dart';
import '../core/subscriptions/subscription_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/membership_status_card.dart';
import '../widgets/ministry_app_bar_title.dart';
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
                      canRenew ? 'Renew Membership' : 'Upgrade Membership',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                    const SizedBox(height: 12),
                    if (_plans.isEmpty) ...[
                      _PlanTile(
                        title: 'Free',
                        subtitle: 'Access free eBooks only.',
                        onTap: _submitting ? null : () => _subscribe(MembershipPlan.free),
                      ),
                      _PlanTile(
                        title: 'Premium',
                        subtitle: 'Access premium eBooks and resources.',
                        onTap: _submitting ? null : () => _subscribe(MembershipPlan.premium),
                      ),
                    ] else
                      ..._plans.map(
                        (plan) => _PlanTile(
                          title: plan.name,
                          subtitle:
                              '${plan.billingInterval} • \$${plan.amount.toStringAsFixed(2)}',
                          onTap: _submitting
                              ? null
                              : () => _subscribe(_planFromCode(plan.code)),
                        ),
                      ),
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
    if (normalized.contains('PREMIUM')) return MembershipPlan.premium;
    return MembershipPlan.unknown;
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
