import 'package:flutter/widgets.dart';

import '../../widgets/login_required.dart';
import 'auth_scope.dart';
import 'auth_state.dart';

bool isAccountAuthenticated(BuildContext context) {
  return AuthScope.maybeOf(context)?.state.isAuthenticated ?? false;
}

AuthState? authStateOf(BuildContext context) {
  return AuthScope.maybeOf(context)?.state;
}

/// Returns true when the current session can perform an account-based action.
/// Guests see a login/register prompt and this returns false.
Future<bool> ensureAccount(BuildContext context) async {
  if (isAccountAuthenticated(context)) {
    return true;
  }
  await showLoginRequiredDialog(context);
  if (!context.mounted) {
    return false;
  }
  return isAccountAuthenticated(context);
}
