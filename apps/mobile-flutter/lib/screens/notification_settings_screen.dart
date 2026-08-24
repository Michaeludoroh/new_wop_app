import 'package:flutter/material.dart';

import '../core/settings/system_notification_settings_launcher.dart';
import '../widgets/ministry_app_bar_title.dart';

/// Device notification preferences. Opens OS settings; no backend flags.
class NotificationSettingsScreen extends StatelessWidget {
  const NotificationSettingsScreen({
    super.key,
    this.notificationSettingsLauncher,
  });

  static const routeName = '/settings/notifications';

  final SystemNotificationSettingsLauncher? notificationSettingsLauncher;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Notification Preferences'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          Text(
            'Notifications',
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              key: const Key('notification_settings_open_device_tile'),
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Push Notifications'),
              subtitle: const Text('Open device notification settings'),
              trailing: const Icon(Icons.open_in_new),
              onTap: () => _openDeviceSettings(context),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Control whether WOPP can send notifications to your device.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openDeviceSettings(BuildContext context) async {
    final launcher =
        notificationSettingsLauncher ?? SystemNotificationSettingsLauncher();
    final opened = await launcher.open();
    if (opened || !context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Open your device Settings, then Notifications, then WOPP.',
        ),
      ),
    );
  }
}
