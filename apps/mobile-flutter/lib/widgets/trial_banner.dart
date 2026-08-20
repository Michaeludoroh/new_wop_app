import 'package:flutter/material.dart';

import '../core/subscriptions/subscription_provider.dart';

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
