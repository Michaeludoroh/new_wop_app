import 'package:flutter/foundation.dart';

/// Temporary runtime diagnostics for policy acceptance verification.
/// Remove after POLICY_ACCEPTANCE_RUNTIME_VERIFICATION is complete.
class PolicyAcceptanceDiagnostics {
  PolicyAcceptanceDiagnostics._();

  static int dashboardMountCount = 0;
  static int dashboardRebuildCount = 0;
  static int gateEnterCount = 0;
  static int gateExitCount = 0;
  static int statusFetchCount = 0;
  static int modalPresentationCount = 0;
  static int policyAcceptedCount = 0;
  static int dashboardUnlockedCount = 0;
  static bool duplicatePromptDetected = false;

  static void reset() {
    dashboardMountCount = 0;
    dashboardRebuildCount = 0;
    gateEnterCount = 0;
    gateExitCount = 0;
    statusFetchCount = 0;
    modalPresentationCount = 0;
    policyAcceptedCount = 0;
    dashboardUnlockedCount = 0;
    duplicatePromptDetected = false;
  }

  static void log(String message) {
    debugPrint('[POLICY_DIAG] $message');
  }
}
