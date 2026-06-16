import 'package:flutter/material.dart';

import '../core/policies/models/policy_models.dart';
import '../core/policies/policy_service.dart';

Future<bool?> showPolicyAcceptanceDialog({
  required BuildContext context,
  required List<PolicyItem> pendingPolicies,
  PolicyService? service,
}) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => PolicyAcceptanceDialog(
      pendingPolicies: pendingPolicies,
      service: service,
    ),
  );
}

class PolicyAcceptanceDialog extends StatefulWidget {
  const PolicyAcceptanceDialog({
    super.key,
    required this.pendingPolicies,
    this.service,
  });

  final List<PolicyItem> pendingPolicies;
  final PolicyService? service;

  @override
  State<PolicyAcceptanceDialog> createState() => _PolicyAcceptanceDialogState();
}

class _PolicyAcceptanceDialogState extends State<PolicyAcceptanceDialog> {
  late final PolicyService _service;
  int _index = 0;
  bool _accepting = false;
  String? _error;

  PolicyItem get _currentPolicy => widget.pendingPolicies[_index];

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? PolicyService();
  }

  Future<void> _acceptCurrent() async {
    setState(() {
      _accepting = true;
      _error = null;
    });

    try {
      await _service.acceptPolicy(_currentPolicy.id);
      if (!mounted) return;

      if (_index >= widget.pendingPolicies.length - 1) {
        Navigator.of(context).pop(true);
        return;
      }

      setState(() => _index += 1);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Unable to record acceptance. Please try again.');
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final policy = _currentPolicy;
    final isUpdatePrompt = policy.version > 1;

    return AlertDialog(
      title: Text(isUpdatePrompt ? 'Policy Update Required' : 'Accept Required Policies'),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isUpdatePrompt
                    ? '${policy.typeLabel} has been updated to version ${policy.version}. Please review and accept the latest version to continue.'
                    : 'Please review and accept ${policy.typeLabel} before using the platform.',
              ),
              const SizedBox(height: 12),
              Text(
                policy.title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(policy.plainContent),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        Text(
          '${_index + 1} of ${widget.pendingPolicies.length}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        FilledButton(
          onPressed: _accepting ? null : _acceptCurrent,
          child: _accepting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_index >= widget.pendingPolicies.length - 1 ? 'Accept' : 'Accept & Continue'),
        ),
      ],
    );
  }
}

Future<void> maybePromptPolicyAcceptance({
  required BuildContext context,
  PolicyService? service,
}) async {
  final policyService = service ?? PolicyService();
  try {
    final status = await policyService.getAcceptanceStatus();
    if (!context.mounted || !status.requiresAction || status.pending.isEmpty) {
      return;
    }
    await showPolicyAcceptanceDialog(
      context: context,
      pendingPolicies: status.pending,
      service: policyService,
    );
  } catch (_) {
    // Non-blocking if policy status cannot be loaded.
  }
}
