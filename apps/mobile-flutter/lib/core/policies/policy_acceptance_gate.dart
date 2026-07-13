import 'package:flutter/material.dart';

import 'policy_service.dart';
import '../../widgets/policy_acceptance_dialog.dart';

/// Coordinates policy acceptance so dashboard rebuilds cannot reopen the modal.
class PolicyAcceptanceGate {
  PolicyAcceptanceGate._();

  static String? _satisfiedUserId;
  static Future<void>? _ongoingPrompt;

  static void resetSession() {
    _satisfiedUserId = null;
    _ongoingPrompt = null;
  }

  static void markSatisfied(String userId) {
    _satisfiedUserId = userId;
  }

  static bool isSatisfiedFor(String? userId) {
    if (userId == null || userId.isEmpty) return false;
    return _satisfiedUserId == userId;
  }

  static Future<void> ensureAccepted({
    required BuildContext context,
    required String userId,
    PolicyService? service,
  }) async {
    if (isSatisfiedFor(userId)) {
      return;
    }

    _ongoingPrompt ??= _runPrompt(context: context, userId: userId, service: service);
    try {
      await _ongoingPrompt;
    } finally {
      _ongoingPrompt = null;
    }
  }

  static Future<void> _runPrompt({
    required BuildContext context,
    required String userId,
    PolicyService? service,
  }) async {
    final policyService = service ?? PolicyService();

    while (context.mounted) {
      if (isSatisfiedFor(userId)) return;

      final status = await policyService.getAcceptanceStatus();
      if (!context.mounted) return;

      if (!status.requiresAction || status.pending.isEmpty) {
        markSatisfied(userId);
        return;
      }

      final completed = await showPolicyAcceptanceDialog(
        context: context,
        pendingPolicies: status.pending,
        service: policyService,
      );

      if (!context.mounted) return;
      if (completed != true) {
        return;
      }

      final refreshed = await policyService.getAcceptanceStatus();
      if (!context.mounted) return;

      if (!refreshed.requiresAction || refreshed.pending.isEmpty) {
        markSatisfied(userId);
        return;
      }
    }
  }
}

Future<void> maybePromptPolicyAcceptance({
  required BuildContext context,
  required String userId,
  PolicyService? service,
}) {
  return PolicyAcceptanceGate.ensureAccepted(
    context: context,
    userId: userId,
    service: service,
  );
}
