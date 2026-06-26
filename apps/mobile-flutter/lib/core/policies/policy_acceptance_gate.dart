import 'package:flutter/material.dart';

import 'policy_acceptance_diagnostics.dart';
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
    PolicyAcceptanceDiagnostics.dashboardUnlockedCount += 1;
    PolicyAcceptanceDiagnostics.log('Dashboard unlocked userId=$userId');
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
      PolicyAcceptanceDiagnostics.log(
        'PolicyAcceptanceGate skipped (already satisfied) userId=$userId',
      );
      return;
    }

    if (_ongoingPrompt != null) {
      PolicyAcceptanceDiagnostics.log(
        'PolicyAcceptanceGate awaiting in-flight prompt userId=$userId',
      );
    }

    _ongoingPrompt ??= _runPrompt(context: context, userId: userId, service: service);
    try {
      await _ongoingPrompt;
    } finally {
      _ongoingPrompt = null;
      PolicyAcceptanceDiagnostics.gateExitCount += 1;
      PolicyAcceptanceDiagnostics.log(
        'PolicyAcceptanceGate exited userId=$userId satisfied=${isSatisfiedFor(userId)}',
      );
    }
  }

  static Future<void> _runPrompt({
    required BuildContext context,
    required String userId,
    PolicyService? service,
  }) async {
    PolicyAcceptanceDiagnostics.gateEnterCount += 1;
    PolicyAcceptanceDiagnostics.log('PolicyAcceptanceGate entered userId=$userId');

    final policyService = service ?? PolicyService();

    while (context.mounted) {
      if (isSatisfiedFor(userId)) return;

      final status = await policyService.getAcceptanceStatus();
      if (!context.mounted) return;

      PolicyAcceptanceDiagnostics.log(
        'Policy status fetched requiresAction=${status.requiresAction} pendingPolicies.length=${status.pending.length}',
      );

      if (!status.requiresAction || status.pending.isEmpty) {
        markSatisfied(userId);
        return;
      }

      PolicyAcceptanceDiagnostics.modalPresentationCount += 1;
      if (PolicyAcceptanceDiagnostics.modalPresentationCount > 1 &&
          PolicyAcceptanceDiagnostics.gateEnterCount == 1) {
        PolicyAcceptanceDiagnostics.duplicatePromptDetected = true;
        PolicyAcceptanceDiagnostics.log(
          'Duplicate modal presentation detected count=${PolicyAcceptanceDiagnostics.modalPresentationCount}',
        );
      }
      PolicyAcceptanceDiagnostics.log(
        'Presenting policy modal #${PolicyAcceptanceDiagnostics.modalPresentationCount} pending=${status.pending.length}',
      );

      final completed = await showPolicyAcceptanceDialog(
        context: context,
        pendingPolicies: status.pending,
        service: policyService,
      );

      if (!context.mounted) return;
      if (completed != true) {
        PolicyAcceptanceDiagnostics.log('Policy modal dismissed without completion');
        return;
      }

      final refreshed = await policyService.getAcceptanceStatus();
      if (!context.mounted) return;

      PolicyAcceptanceDiagnostics.log(
        'Status re-fetched after modal requiresAction=${refreshed.requiresAction} pendingPolicies.length=${refreshed.pending.length}',
      );

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
