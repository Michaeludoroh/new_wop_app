import 'package:flutter/material.dart';

import '../screens/login_screen.dart';
import '../screens/register_screen.dart';

class LoginRequiredView extends StatelessWidget {
  const LoginRequiredView({
    super.key,
    this.message =
        'Please sign in or create an account to continue.',
    this.showGoBack = true,
  });

  final String message;
  final bool showGoBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final navigator = Navigator.of(context);
    final canGoBack = showGoBack && navigator.canPop();

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            Icon(
              Icons.lock_outline,
              size: 72,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Login Required',
              key: const Key('login_required_title'),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            const Spacer(),
            FilledButton(
              key: const Key('login_required_login_button'),
              onPressed: () {
                navigator.pushNamed(LoginScreen.routeName);
              },
              child: const Text('Login'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              key: const Key('login_required_register_button'),
              onPressed: () {
                navigator.pushNamed(RegisterScreen.routeName);
              },
              child: const Text('Register'),
            ),
            if (canGoBack) ...[
              const SizedBox(height: 8),
              TextButton(
                key: const Key('login_required_cancel_button'),
                onPressed: () => navigator.maybePop(),
                child: const Text('Go Back'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class LoginRequiredScreen extends StatelessWidget {
  const LoginRequiredScreen({
    super.key,
    this.message =
        'Please sign in or create an account to continue.',
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login Required')),
      body: LoginRequiredView(message: message),
    );
  }
}

Future<bool> showLoginRequiredDialog(BuildContext context) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: const Text('Login Required'),
        content: const Text(
          'Please sign in or create an account to continue.',
        ),
        actions: [
          TextButton(
            key: const Key('login_required_dialog_cancel_button'),
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            key: const Key('login_required_dialog_register_button'),
            onPressed: () {
              Navigator.of(dialogContext).pop(false);
              Navigator.of(context).pushNamed(RegisterScreen.routeName);
            },
            child: const Text('Register'),
          ),
          FilledButton(
            key: const Key('login_required_dialog_login_button'),
            onPressed: () {
              Navigator.of(dialogContext).pop(false);
              Navigator.of(context).pushNamed(LoginScreen.routeName);
            },
            child: const Text('Login'),
          ),
        ],
      );
    },
  );
  return result == true;
}
