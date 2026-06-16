import 'package:flutter/widgets.dart';

import 'auth_provider.dart';

class AuthScope extends InheritedNotifier<AuthProvider> {
  const AuthScope({
    super.key,
    required AuthProvider notifier,
    required super.child,
  }) : super(notifier: notifier);

  static AuthProvider of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope not found in widget tree');
    return scope!.notifier!;
  }

  static AuthProvider read(BuildContext context) {
    final element =
        context.getElementForInheritedWidgetOfExactType<AuthScope>();
    final widget = element?.widget as AuthScope?;
    assert(widget != null, 'AuthScope not found in widget tree');
    return widget!.notifier!;
  }
}
