import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/auth/auth_scope.dart';
import '../core/theme/app_theme.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/ministry_logo.dart';

class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, this.email});

  final String? email;

  static const String routeName = '/verify-email';

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  bool _sending = false;
  bool _checking = false;
  String? _message;

  String get _email =>
      widget.email?.trim().isNotEmpty == true
          ? widget.email!.trim()
          : (AuthScope.of(context).state.user?.email ?? '');

  Future<void> _resend() async {
    setState(() {
      _sending = true;
      _message = null;
    });

    try {
      await AuthScope.read(context).resendVerificationEmail();
      if (!mounted) return;
      setState(() {
        _sending = false;
        _message = 'Verification email sent. Check your inbox.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _message = 'Could not send email. Please try again shortly.';
      });
    }
  }

  Future<void> _openMailApp() async {
    final uri = Uri(scheme: 'mailto');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _continue() async {
    setState(() {
      _checking = true;
      _message = null;
    });

    final verified = await AuthScope.read(context).refreshProfileAfterVerification();

    if (!mounted) return;

    setState(() {
      _checking = false;
    });

    if (verified) {
      Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
      return;
    }

    setState(() {
      _message = 'Email not verified yet. Open the link in your inbox, then tap Continue.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: const AppBar(
        title: MinistryAppBarTitle(title: 'Verify Email'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: MinistryLogo(
                        height: MinistryLogo.authFormHeight,
                        variant: MinistryLogoVariant.hero,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Please verify your email',
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: theme.colorScheme.primary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      "We've sent a verification link to:",
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _email,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Verify your email to unlock premium content. You can continue using the app while you wait.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (_message != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _message!,
                        style: TextStyle(color: theme.colorScheme.primary),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      style: AppTheme.accentButtonStyle,
                      onPressed: _sending ? null : _resend,
                      child: _sending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Resend Email'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _openMailApp,
                      child: const Text('Open Mail App'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _checking ? null : _continue,
                      child: _checking
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Continue'),
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
