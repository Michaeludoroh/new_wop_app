// TEMP: Delete this file after Crashlytics verification is complete.

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/firebase/crashlytics_bootstrap.dart';

/// Temporary developer screen for verifying Firebase Crashlytics end-to-end.
///
/// Reachable only from [AboutScreen] in non-release builds.
/// Remove after verification.
class CrashlyticsDebugScreen extends StatelessWidget {
  const CrashlyticsDebugScreen({super.key});

  static const routeName = '/crashlytics-debug';

  Future<void> _sendNonFatal(BuildContext context) async {
    await CrashlyticsBootstrap.sendDevelopmentTestReport();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          CrashlyticsBootstrap.isCollectionEnabled
              ? 'Non-fatal test sent. Check Firebase Console in a few minutes.'
              : 'Non-fatal test invoked locally. Use a profile build to upload.',
        ),
      ),
    );
  }

  Future<void> _confirmFatalCrash(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Trigger fatal crash?'),
        content: const Text(
          'The app will crash immediately. Use a profile build '
          '(flutter run --profile) so the report uploads to Crashlytics.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Crash app'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      CrashlyticsBootstrap.crashForDevelopmentTesting();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final collectionEnabled = CrashlyticsBootstrap.isCollectionEnabled;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crashlytics Dev Tools'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Temporary verification screen',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Remove this screen after confirming reports appear in '
            'Firebase Console → Crashlytics.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          _StatusCard(
            label: 'Crashlytics initialized',
            value: CrashlyticsBootstrap.isInitialized ? 'Yes' : 'No',
          ),
          const SizedBox(height: 12),
          _StatusCard(
            label: 'Collection enabled (uploads)',
            value: collectionEnabled ? 'Yes' : 'No',
          ),
          const SizedBox(height: 12),
          _StatusCard(
            label: 'Build mode',
            value: kReleaseMode
                ? 'Release'
                : (kDebugMode ? 'Debug' : 'Profile'),
          ),
          const SizedBox(height: 16),
          if (!collectionEnabled)
            Card(
              color: theme.colorScheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  kDebugMode
                      ? 'Debug builds do not upload crash reports. Run '
                          '`flutter run --profile` to verify in Firebase Console.'
                      : 'Collection is off. Ensure Firebase initialized successfully.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onErrorContainer,
                  ),
                ),
              ),
            ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => _sendNonFatal(context),
            icon: const Icon(Icons.bug_report_outlined),
            label: const Text('Send non-fatal test report'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _confirmFatalCrash(context),
            icon: const Icon(Icons.warning_amber_outlined),
            label: const Text('Trigger fatal crash'),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text(
              value,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
