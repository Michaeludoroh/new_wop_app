import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/auth/auth_scope.dart';
import '../core/auth/models/auth_models.dart';
import '../core/config/store_urls.dart';
import '../core/constants/app_constants.dart';
import '../core/theme/theme_controller.dart';
import '../core/theme/theme_scope.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'about_screen.dart';
import 'delete_account_screen.dart';
import 'forgot_password_screen.dart';
import 'notification_settings_screen.dart';
import 'profile_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static const routeName = '/settings';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = AuthScope.of(context).state;
    final user = authState.user;
    final themeController = ThemeScope.maybeOf(context);
    final displayName = _displayName(user);
    final displayEmail = _displayEmail(user);

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          const _SectionHeader(title: 'Account'),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  key: const Key('settings_profile_tile'),
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Profile'),
                  subtitle: user == null
                      ? Text(
                          authState.isBusy
                              ? 'Loading account…'
                              : 'Account information is unavailable.',
                        )
                      : null,
                  trailing: authState.isBusy && user == null
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).pushNamed(
                    ProfileScreen.routeName,
                  ),
                ),
                if (user != null) ...[
                  ListTile(
                    title: const Text('Name'),
                    subtitle: Text(
                      displayName,
                      key: const Key('settings_account_name'),
                    ),
                  ),
                  ListTile(
                    title: const Text('Email'),
                    subtitle: Text(
                      displayEmail,
                      key: const Key('settings_account_email'),
                    ),
                  ),
                ],
                const Divider(height: 1),
                ListTile(
                  key: const Key('settings_reset_password_tile'),
                  leading: const Icon(Icons.lock_reset_outlined),
                  title: const Text('Reset Password'),
                  subtitle: const Text(
                    'A reset email will be sent. In-app change-password is not available.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  enabled: !authState.isBusy,
                  onTap: () => Navigator.of(context).pushNamed(
                    ForgotPasswordScreen.routeName,
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  key: const Key('settings_delete_account_tile'),
                  leading: Icon(
                    Icons.person_off_outlined,
                    color: theme.colorScheme.error,
                  ),
                  title: Text(
                    'Delete Account',
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                  subtitle: const Text(
                    'Permanently delete your WOPP account and personal data',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  enabled: !authState.isBusy,
                  onTap: () => Navigator.of(context).pushNamed(
                    DeleteAccountScreen.routeName,
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  key: const Key('settings_logout_tile'),
                  leading: Icon(
                    Icons.logout,
                    color: theme.colorScheme.error,
                  ),
                  title: Text(
                    'Log out',
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                  subtitle: const Text('Sign out of this device'),
                  enabled: !authState.isBusy,
                  onTap: () => _logout(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _SectionHeader(title: 'Appearance'),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: themeController == null
                ? const ListTile(
                    title: Text('Theme'),
                    subtitle: Text('Theme settings are unavailable.'),
                  )
                : AnimatedBuilder(
                    animation: themeController,
                    builder: (context, _) {
                      return RadioGroup<ThemeMode>(
                        groupValue: themeController.themeMode,
                        onChanged: (mode) => _setTheme(themeController, mode),
                        child: const Column(
                          children: [
                            ListTile(
                              leading: Icon(Icons.palette_outlined),
                              title: Text('Theme'),
                              subtitle: Text(
                                'Applies across WOPP on this device',
                              ),
                            ),
                            RadioListTile<ThemeMode>(
                              title: Text('System'),
                              value: ThemeMode.system,
                            ),
                            RadioListTile<ThemeMode>(
                              title: Text('Light'),
                              value: ThemeMode.light,
                            ),
                            RadioListTile<ThemeMode>(
                              title: Text('Dark'),
                              value: ThemeMode.dark,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 16),
          const _SectionHeader(title: 'Notifications'),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              key: const Key('settings_notification_preferences_tile'),
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Notification Preferences'),
              subtitle: const Text('Push notifications for this device'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).pushNamed(
                NotificationSettingsScreen.routeName,
              ),
            ),
          ),
          const SizedBox(height: 16),
          const _SectionHeader(title: 'About'),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('About WOPP'),
                  subtitle: const Text('App info, credits, and version'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).pushNamed(
                    AboutScreen.routeName,
                  ),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.tag_outlined),
                  title: Text('App version'),
                  subtitle: Text(AppConstants.versionLabel),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: const Text('Privacy Policy'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () => _openUrl(context, StoreUrls.privacyPolicyUrl),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: const Text('Terms of Service'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () => _openUrl(context, StoreUrls.termsOfServiceUrl),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.support_agent_outlined),
                  title: const Text('Contact / Support'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () => _openUrl(context, StoreUrls.supportUrl),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _displayName(AuthUser? user) {
    final name = user?.name?.trim();
    if (name == null || name.isEmpty) {
      return 'Name not set';
    }
    return name;
  }

  String _displayEmail(AuthUser? user) {
    final email = user?.email.trim() ?? '';
    if (email.isEmpty) {
      return 'Email unavailable';
    }
    return email;
  }

  void _setTheme(ThemeController controller, ThemeMode? mode) {
    if (mode == null) return;
    unawaited(controller.setThemeMode(mode));
  }

  Future<void> _logout(BuildContext context) async {
    await AuthScope.read(context).logout();
    if (!context.mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _openUrl(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link.')),
      );
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open link.')),
      );
    }
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
    );
  }
}
