import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/config/store_urls.dart';

/// Legal and support links required for App Store / Play Store compliance.
class StoreLegalLinks extends StatelessWidget {
  const StoreLegalLinks({super.key});

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

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy Policy'),
            subtitle: const Text('View our privacy policy online'),
            trailing: const Icon(Icons.open_in_new),
            onTap: () => _openUrl(context, StoreUrls.privacyPolicyUrl),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: const Text('Terms of Service'),
            subtitle: const Text('View terms of use online'),
            trailing: const Icon(Icons.open_in_new),
            onTap: () => _openUrl(context, StoreUrls.termsOfServiceUrl),
          ),
          ListTile(
            leading: const Icon(Icons.support_agent_outlined),
            title: const Text('Support'),
            subtitle: const Text('Get help and contact support'),
            trailing: const Icon(Icons.open_in_new),
            onTap: () => _openUrl(context, StoreUrls.supportUrl),
          ),
          ListTile(
            leading: const Icon(Icons.person_off_outlined),
            title: const Text('Account Deletion'),
            subtitle: const Text('Request deletion of your account'),
            trailing: const Icon(Icons.open_in_new),
            onTap: () => _openUrl(context, StoreUrls.accountDeletionUrl),
          ),
        ],
      ),
    );
  }
}
