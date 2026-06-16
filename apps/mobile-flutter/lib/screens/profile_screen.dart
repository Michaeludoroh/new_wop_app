import 'package:flutter/material.dart';

import '../core/policies/models/policy_models.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'policy_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const routeName = '/profile';

  @override
  Widget build(BuildContext context) {
    final policyLinks = PolicyTypeDefinitions.all
        .map(
          (type) => _PolicyLink(
            type: type,
            title: PolicyTypeDefinitions.labelFor(type),
            icon: _iconForType(type),
          ),
        )
        .toList();

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Policies & Governance',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            'Review platform policies before participating in the community.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          ...policyLinks.map(
            (link) => Card(
              child: ListTile(
                leading: Icon(link.icon),
                title: Text(link.title),
                subtitle: const Text('View current published version'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.of(context).pushNamed(
                  PolicyScreen.routeName,
                  arguments: link.type,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case PolicyTypeDefinitions.termsOfUse:
        return Icons.description_outlined;
      case PolicyTypeDefinitions.privacyPolicy:
        return Icons.privacy_tip_outlined;
      case PolicyTypeDefinitions.communityGuidelines:
        return Icons.groups_outlined;
      case PolicyTypeDefinitions.contentSharingRules:
        return Icons.share_outlined;
      default:
        return Icons.article_outlined;
    }
  }
}

class _PolicyLink {
  const _PolicyLink({
    required this.type,
    required this.title,
    required this.icon,
  });

  final String type;
  final String title;
  final IconData icon;
}
