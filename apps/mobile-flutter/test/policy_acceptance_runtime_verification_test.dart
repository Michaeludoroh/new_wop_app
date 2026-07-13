import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/policies/models/policy_models.dart';
import 'package:ministry_mobile/core/policies/policy_acceptance_gate.dart';
import 'package:ministry_mobile/core/policies/policy_service.dart';
import 'package:ministry_mobile/widgets/policy_acceptance_dialog.dart';

PolicyItem _policy(String id, String type, String label) {
  return PolicyItem(
    id: id,
    type: type,
    typeLabel: label,
    title: label,
    slug: '${type.toLowerCase()}-v1',
    content: '<p>$label content</p>',
    version: 1,
    published: true,
  );
}

class _FakePolicyService extends PolicyService {
  _FakePolicyService(this._pending);

  final List<PolicyItem> _pending;
  final List<String> acceptedIds = [];
  int statusFetchCount = 0;

  @override
  Future<PolicyAcceptanceStatus> getAcceptanceStatus() async {
    statusFetchCount += 1;
    return PolicyAcceptanceStatus(
      pending: List<PolicyItem>.from(_pending),
      accepted: const [],
      requiresAction: _pending.isNotEmpty,
    );
  }

  @override
  Future<void> acceptPolicy(String policyId) async {
    acceptedIds.add(policyId);
    _pending.removeWhere((p) => p.id == policyId);
  }
}

Finder _acceptButton(int step, int total) {
  return find.text(step >= total ? 'Accept & Continue' : 'Accept & Next Policy');
}

void main() {
  setUp(() {
    PolicyAcceptanceGate.resetSession();
  });

  testWidgets('runtime flow: sequential accept through gate without duplicate modals', (
    tester,
  ) async {
    final policies = [
      _policy('p1', 'TERMS_OF_USE', 'Terms of Use'),
      _policy('p2', 'PRIVACY_POLICY', 'Privacy Policy'),
      _policy('p3', 'COMMUNITY_GUIDELINES', 'Community Guidelines'),
      _policy('p4', 'CONTENT_SHARING_RULES', 'Content Sharing Rules'),
    ];
    final fakeService = _FakePolicyService(List<PolicyItem>.from(policies));

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return Scaffold(
              body: ElevatedButton(
                onPressed: () => PolicyAcceptanceGate.ensureAccepted(
                  context: context,
                  userId: 'verify-user-1',
                  service: fakeService,
                ),
                child: const Text('Start'),
              ),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('Start'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Policy 1 of 4'), findsOneWidget);
    expect(find.byType(PolicyAcceptanceDialog), findsOneWidget);

    for (var i = 0; i < 4; i++) {
      await tester.tap(_acceptButton(i + 1, 4));
      await tester.pumpAndSettle();
    }

    expect(PolicyAcceptanceGate.isSatisfiedFor('verify-user-1'), isTrue);
    expect(find.byType(PolicyAcceptanceDialog), findsNothing);
    expect(fakeService.acceptedIds, hasLength(4));
  });

  testWidgets('gate deduplicates concurrent ensureAccepted calls', (tester) async {
    final fakeService = _FakePolicyService([
      _policy('p1', 'TERMS_OF_USE', 'Terms of Use'),
    ]);

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return Scaffold(
              body: Column(
                children: [
                  ElevatedButton(
                    onPressed: () => PolicyAcceptanceGate.ensureAccepted(
                      context: context,
                      userId: 'verify-user-2',
                      service: fakeService,
                    ),
                    child: const Text('A'),
                  ),
                  ElevatedButton(
                    onPressed: () => PolicyAcceptanceGate.ensureAccepted(
                      context: context,
                      userId: 'verify-user-2',
                      service: fakeService,
                    ),
                    child: const Text('B'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );

    await tester.tap(find.text('A'));
    await tester.pump();
    await tester.tap(find.text('B'));
    await tester.pumpAndSettle();

    expect(find.byType(PolicyAcceptanceDialog), findsOneWidget);

    await tester.tap(_acceptButton(1, 1));
    await tester.pumpAndSettle();

    expect(PolicyAcceptanceGate.isSatisfiedFor('verify-user-2'), isTrue);
    expect(find.byType(PolicyAcceptanceDialog), findsNothing);
    expect(fakeService.acceptedIds, hasLength(1));
  });
}
