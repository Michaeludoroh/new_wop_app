import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/http/api_error.dart';
import '../widgets/ministry_app_bar_title.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  static const routeName = '/settings/delete-account';

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  static const _confirmationPhrase = 'DELETE';

  final TextEditingController _confirmController = TextEditingController();
  bool _acknowledged = false;
  bool _deleting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _confirmController.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    return !_deleting &&
        _acknowledged &&
        _confirmController.text.trim().toUpperCase() == _confirmationPhrase;
  }

  Future<void> _confirmAndDelete() async {
    if (!_canSubmit) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Delete account?'),
          content: const Text(
            'This permanently deletes your WOPP account and personal data. '
            'This cannot be undone.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              key: const Key('delete_account_confirm_button'),
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(dialogContext).colorScheme.error,
                foregroundColor: Theme.of(dialogContext).colorScheme.onError,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) return;
    await _deleteAccount();
  }

  Future<void> _deleteAccount() async {
    if (_deleting) return;

    setState(() {
      _deleting = true;
      _errorMessage = null;
    });

    try {
      await AuthScope.read(context).deleteAccount();
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _deleting = false;
        _errorMessage = safeAuthErrorMessage(
          error,
          fallback:
              'Unable to delete your account. Check your connection and try again.',
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final errorColor = theme.colorScheme.error;

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Delete Account'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            'Delete your WOPP account',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'This action is permanent. You can start this process here in the app. '
            'You do not need to email support or visit the website.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What will be deleted',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const _Bullet(
                    text: 'Your profile, name, email, and sign-in credentials.',
                  ),
                  const _Bullet(
                    text:
                        'This device session and all other signed-in sessions.',
                  ),
                  const _Bullet(
                    text: 'Push notification tokens for your devices.',
                  ),
                  const _Bullet(
                    text:
                        'Personal activity such as event RSVPs, enrollments, reading progress, and in-app notifications.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What is kept',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const _Bullet(
                    text:
                        'Purchase and payment records needed for accounting and store compliance, without your name or email.',
                  ),
                  const _Bullet(
                    text:
                        'If you have WOPP Premium through the App Store or Google Play, billing continues until you cancel the subscription in those store settings. Deleting your WOPP account does not refund or automatically cancel the store subscription.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          CheckboxListTile(
            key: const Key('delete_account_acknowledge_checkbox'),
            value: _acknowledged,
            onChanged: _deleting
                ? null
                : (value) => setState(() => _acknowledged = value ?? false),
            controlAffinity: ListTileControlAffinity.leading,
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'I understand that deleting my account is permanent and cannot be undone.',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            key: const Key('delete_account_confirm_field'),
            controller: _confirmController,
            enabled: !_deleting,
            textCapitalization: TextCapitalization.characters,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Type DELETE to confirm',
              helperText: 'This extra step prevents accidental deletion.',
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              style: TextStyle(color: errorColor),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              key: const Key('delete_account_submit_button'),
              style: FilledButton.styleFrom(
                backgroundColor: errorColor,
                foregroundColor: theme.colorScheme.onError,
              ),
              onPressed: _canSubmit ? _confirmAndDelete : null,
              child: Text(_deleting ? 'Deleting…' : 'Delete Account'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('•  '),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
