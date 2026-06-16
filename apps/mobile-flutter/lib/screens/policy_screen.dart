import 'package:flutter/material.dart';

import '../core/policies/models/policy_models.dart';
import '../core/policies/policy_service.dart';
import '../widgets/ministry_app_bar_title.dart';

class PolicyScreen extends StatefulWidget {
  const PolicyScreen({
    super.key,
    required this.policyType,
    this.service,
  });

  static const routeName = '/policies/view';

  final String policyType;
  final PolicyService? service;

  @override
  State<PolicyScreen> createState() => _PolicyScreenState();
}

class TermsOfUseScreen extends StatelessWidget {
  const TermsOfUseScreen({super.key, this.service});

  final PolicyService? service;

  static const routeName = '/policies/terms-of-use';

  @override
  Widget build(BuildContext context) {
    return PolicyScreen(
      policyType: PolicyTypeDefinitions.termsOfUse,
      service: service,
    );
  }
}

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key, this.service});

  final PolicyService? service;

  static const routeName = '/policies/privacy-policy';

  @override
  Widget build(BuildContext context) {
    return PolicyScreen(
      policyType: PolicyTypeDefinitions.privacyPolicy,
      service: service,
    );
  }
}

class CommunityGuidelinesScreen extends StatelessWidget {
  const CommunityGuidelinesScreen({super.key, this.service});

  final PolicyService? service;

  static const routeName = '/policies/community-guidelines';

  @override
  Widget build(BuildContext context) {
    return PolicyScreen(
      policyType: PolicyTypeDefinitions.communityGuidelines,
      service: service,
    );
  }
}

class ContentSharingRulesScreen extends StatelessWidget {
  const ContentSharingRulesScreen({super.key, this.service});

  final PolicyService? service;

  static const routeName = '/policies/content-sharing-rules';

  @override
  Widget build(BuildContext context) {
    return PolicyScreen(
      policyType: PolicyTypeDefinitions.contentSharingRules,
      service: service,
    );
  }
}

class _PolicyScreenState extends State<PolicyScreen> {
  late final PolicyService _service;

  bool _loading = true;
  String? _error;
  PolicyItem? _policy;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? PolicyService();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final policy = await _service.getCurrentPolicy(widget.policyType);
      if (!mounted) return;
      setState(() => _policy = policy);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load policy.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final policy = _policy;
    final title = PolicyTypeDefinitions.labelFor(widget.policyType);

    return Scaffold(
      appBar: AppBar(title: MinistryAppBarTitle(title: title)),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!),
                          const SizedBox(height: 12),
                          FilledButton(onPressed: _load, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : policy == null
                    ? const Center(child: Text('Policy not found.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                Chip(label: Text('Version ${policy.version}')),
                                Chip(label: Text(policy.effectiveDateLabel)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              policy.title,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            SelectableText(
                              policy.plainContent,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                        ),
                      ),
      ),
    );
  }
}
