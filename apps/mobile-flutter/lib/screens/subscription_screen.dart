import 'dart:io';

import 'package:flutter/material.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../core/http/api_error.dart';
import '../core/subscriptions/mobile_billing_exception.dart';
import '../core/subscriptions/mobile_billing_service.dart';
import '../core/subscriptions/subscription_models.dart';
import '../core/subscriptions/subscription_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/trial_banner.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({
    super.key,
    this.service,
    this.mobileBillingService,
  });

  static const routeName = '/subscriptions';

  final SubscriptionService? service;
  final MobileBillingService? mobileBillingService;

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  late final SubscriptionService _service = widget.service ?? SubscriptionService();
  late final MobileBillingService _mobileBilling =
      widget.mobileBillingService ?? MobileBillingService(subscriptionService: _service);

  bool _loading = true;
  bool _submitting = false;
  String? _error;
  SubscriptionStatusModel? _status;
  String? _selectedProductId;

  bool get _usesNativeBilling => _mobileBilling.isSupported;

  List<WoppPremiumOffer> get _offers => _mobileBilling.availableOffers;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _mobileBilling.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    if (_usesNativeBilling) {
      await _mobileBilling.initialize(
        onPurchaseUpdated: _handlePurchaseUpdated,
        onError: (error) {
          _logBillingError('store purchase stream', error, StackTrace.current);
          if (!mounted) return;
          setState(() {
            _error = _safeErrorMessage(
              error,
              'Store purchase failed. Please try again.',
            );
            _submitting = false;
          });
        },
      );
    }

    await _loadStatus();
    if (!mounted) return;
    final setupMessage = _mobileBilling.storeSetupMessage;
    if (_usesNativeBilling && _offers.isEmpty && setupMessage != null) {
      setState(() {
        _error ??= setupMessage;
      });
    }
    _selectedProductId ??= _offers.isEmpty ? null : _offers.first.productId;
  }

  Future<void> _loadStatus() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      SubscriptionStatusModel? status = await _service.getStatus();
      if (_usesNativeBilling) {
        final mobileStatus = await _service.getMobileStatus();
        status = mobileStatus.subscription ?? status;
      }

      if (!mounted) return;
      setState(() {
        _status = status;
        _selectedProductId ??= _offers.isEmpty ? null : _offers.first.productId;
      });
    } catch (error, stackTrace) {
      _logBillingError('load subscription status', error, stackTrace);
      if (!mounted) return;
      setState(() {
        _error = _safeErrorMessage(error, 'Failed to load subscription status.');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handlePurchaseUpdated(PurchaseDetails purchase) async {
    if (purchase.status == PurchaseStatus.pending) {
      if (!mounted) return;
      setState(() => _submitting = true);
      return;
    }

    if (purchase.status == PurchaseStatus.canceled) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = null;
      });
      return;
    }

    if (purchase.status == PurchaseStatus.error) {
      debugPrint(
        '[billing] PurchaseStatus.error code=${purchase.error?.code} message=${purchase.error?.message}',
      );
      try {
        await _mobileBilling.completePurchase(purchase);
      } catch (error, stackTrace) {
        _logBillingError('complete failed purchase', error, stackTrace);
      }
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = purchase.error?.message.trim().isNotEmpty == true
            ? 'Purchase failed: ${purchase.error!.message}'
            : 'The store could not complete this purchase. Please try again.';
      });
      return;
    }

    if (purchase.status == PurchaseStatus.purchased ||
        purchase.status == PurchaseStatus.restored) {
      try {
        await _mobileBilling.verifyPurchase(purchase);
        await _mobileBilling.completePurchase(purchase);
        if (!mounted) return;
        await _loadStatus();
        if (!mounted) return;
        SubscriptionScope.maybeOf(context)?.refresh();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('WOPP Premium activated successfully.')),
        );
      } catch (error, stackTrace) {
        _logBillingError('purchase verification', error, stackTrace);
        try {
          await _mobileBilling.completePurchase(purchase);
        } catch (completeError, completeStack) {
          _logBillingError('complete after verification failure', completeError, completeStack);
        }
        if (!mounted) return;
        setState(() {
          _error = _safeErrorMessage(
            error,
            'Purchase verification failed. Use Restore purchases if you were charged.',
          );
        });
      } finally {
        if (mounted) setState(() => _submitting = false);
      }
    }
  }

  Future<void> _subscribeSelected() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      if (!_usesNativeBilling) {
        setState(() {
          _error =
              'WOPP Premium is billed through the App Store or Google Play on a mobile device.';
        });
        return;
      }

      final productId = _selectedProductId ??
          (_offers.isEmpty ? MobileBillingConfig.premiumProductId : _offers.first.productId);
      await _mobileBilling.purchaseOffer(productId);
    } catch (error, stackTrace) {
      _logBillingError('subscribe', error, stackTrace);
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = _safeErrorMessage(
          error,
          'Subscription update failed. Please try again.',
        );
      });
    }
  }

  Future<void> _restorePurchases() async {
    if (!_usesNativeBilling) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await _mobileBilling.restorePurchases();
      if (!mounted) return;
      await _loadStatus();
      if (!mounted) return;
      SubscriptionScope.maybeOf(context)?.refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Purchases restored successfully.')),
      );
    } catch (error, stackTrace) {
      _logBillingError('restore purchases', error, stackTrace);
      if (!mounted) return;
      setState(() {
        _error = _safeErrorMessage(error, 'Unable to restore purchases.');
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offers = _offers;
    final hasPremium = _status?.hasPremiumAccess ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'WOPP Premium'),
        actions: [
          if (_usesNativeBilling)
            TextButton(
              onPressed: _submitting ? null : _restorePurchases,
              child: const Text('Restore'),
            ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _loadStatus,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      'WOPP Premium',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.primaryPurple,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Choose the plan that works best for you.',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.onSurfaceVariant,
                          ),
                    ),
                    if (hasPremium) ...[
                      const SizedBox(height: 12),
                      Text(
                        'You already have WOPP Premium access. Manage billing in ${Platform.isIOS ? 'App Store' : Platform.isAndroid ? 'Google Play' : 'your store'} settings.',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
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
                    if (offers.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            _usesNativeBilling
                                ? (_mobileBilling.storeSetupMessage ??
                                    'WOPP Premium options will appear here when they are available from the store.')
                                : 'WOPP Premium is billed through the App Store or Google Play on a mobile device.',
                          ),
                        ),
                      )
                    else
                      ...offers.map(
                        (offer) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OfferCard(
                            offer: offer,
                            selected: _selectedProductId == offer.productId,
                            billedThrough: Platform.isIOS
                                ? 'Billed through the App Store'
                                : 'Billed through Google Play',
                            onSelect: () => setState(() => _selectedProductId = offer.productId),
                          ),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text('Benefits', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    const _BenefitLine(text: 'Complete eBook library'),
                    const _BenefitLine(text: 'Daily devotionals'),
                    const _BenefitLine(text: 'Premium messages'),
                    const _BenefitLine(text: 'Video library'),
                    const _BenefitLine(text: 'Live events'),
                    const _BenefitLine(text: 'Member-only resources'),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting || offers.isEmpty ? null : _subscribeSelected,
                        child: Text(_submitting ? 'Processing...' : 'Subscribe Now'),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  String _safeErrorMessage(Object error, String fallback) {
    if (error is MobileBillingException && error.message.trim().isNotEmpty) {
      return error.message;
    }
    return messageFromDio(error, fallback: fallback);
  }

  void _logBillingError(String action, Object error, StackTrace stackTrace) {
    debugPrint('[billing] $action failed: $error');
    debugPrint('[billing] $stackTrace');
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({
    required this.offer,
    required this.selected,
    required this.billedThrough,
    required this.onSelect,
  });

  final WoppPremiumOffer offer;
  final bool selected;
  final String billedThrough;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: selected ? AppColors.lightPurple : null,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onSelect,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: AppColors.primaryPurple,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      offer.displayName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryPurple,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      offer.priceLabel,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      billedThrough,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
          const Icon(Icons.check_circle, color: AppColors.accentGold, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
