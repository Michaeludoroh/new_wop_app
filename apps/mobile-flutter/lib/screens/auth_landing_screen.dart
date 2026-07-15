import 'package:flutter/material.dart';

import '../core/constants/app_constants.dart';
import '../core/theme/app_theme.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/ministry_logo.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class AuthLandingScreen extends StatelessWidget {
  const AuthLandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const MinistryLogo(
                      height: MinistryLogo.authFormHeight,
                      variant: MinistryLogoVariant.hero,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome to ${AppConstants.appName}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      AppConstants.appTagline,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Sign in to access events, programs, library, and more.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      key: const Key('go_to_login_button'),
                      style: AppTheme.accentButtonStyle,
                      onPressed: () {
                        Navigator.of(context).pushNamed(LoginScreen.routeName);
                      },
                      child: const Text('Sign In'),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      key: const Key('go_to_register_from_landing_button'),
                      onPressed: () {
                        Navigator.of(context)
                            .pushNamed(RegisterScreen.routeName);
                      },
                      child: const Text('Create account'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
