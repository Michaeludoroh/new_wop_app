import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/policies/models/policy_models.dart';
import '../core/users/users_service.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'policy_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  static const routeName = '/profile';

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UsersService _usersService = UsersService();
  final TextEditingController _nameController = TextEditingController();

  bool _initialized = false;
  bool _saving = false;
  String? _statusMessage;
  String? _errorMessage;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      final user = AuthScope.of(context).state.user;
      _nameController.text = user?.name ?? '';
      _initialized = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }


  Future<void> _saveProfile() async {
    final auth = AuthScope.of(context);
    final user = auth.state.user;
    final fullName = _nameController.text.trim();
    if (user == null || fullName.length < 2) {
      setState(() => _errorMessage = 'Enter a valid name.');
      return;
    }

    setState(() {
      _saving = true;
      _errorMessage = null;
      _statusMessage = null;
    });

    try {
      await _usersService.updateProfile(userId: user.id, fullName: fullName);
      await auth.reloadCurrentUser();
      if (!mounted) return;
      setState(() => _statusMessage = 'Profile updated.');
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Failed to update profile.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthScope.of(context).state.user;
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
          Text('Account', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(user?.email ?? 'Unknown user'),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                  ),
                  const SizedBox(height: 12),
                  if (_errorMessage != null)
                    Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  if (_statusMessage != null)
                    Text(_statusMessage!, style: TextStyle(color: Theme.of(context).colorScheme.primary)),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: Text(_saving ? 'Saving...' : 'Save profile'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
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
