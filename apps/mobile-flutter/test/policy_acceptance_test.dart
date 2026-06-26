import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/policies/models/policy_models.dart';
import 'package:ministry_mobile/core/policies/policy_acceptance_gate.dart';

void main() {
  group('PolicyAcceptanceStatus.fromJson', () {
    test('parses flat API payload', () {
      final status = PolicyAcceptanceStatus.fromJson({
        'requiresAction': true,
        'pending': [
          {
            'id': 'policy-1',
            'type': 'TERMS_OF_USE',
            'typeLabel': 'Terms of Use',
            'title': 'Terms of Use',
            'slug': 'terms-of-use-v1',
            'content': '<p>Terms</p>',
            'version': 1,
            'published': true,
          },
        ],
        'accepted': [],
      });

      expect(status.requiresAction, isTrue);
      expect(status.pending, hasLength(1));
      expect(status.pending.first.typeLabel, 'Terms of Use');
    });

    test('parses nested data payload', () {
      final status = PolicyAcceptanceStatus.fromJson({
        'data': {
          'requiresAction': false,
          'pending': [],
          'accepted': [
            {
              'version': 1,
              'acceptedAt': '2026-06-17T12:00:00.000Z',
              'policy': {
                'id': 'policy-1',
                'type': 'PRIVACY_POLICY',
                'typeLabel': 'Privacy Policy',
                'title': 'Privacy Policy',
                'slug': 'privacy-policy-v1',
                'content': '<p>Privacy</p>',
                'version': 1,
                'published': true,
              },
            },
          ],
        },
      });

      expect(status.requiresAction, isFalse);
      expect(status.pending, isEmpty);
      expect(status.accepted, hasLength(1));
    });
  });

  group('PolicyAcceptanceGate session tracking', () {
    setUp(PolicyAcceptanceGate.resetSession);

    test('marks and checks satisfied user', () {
      PolicyAcceptanceGate.markSatisfied('user-1');
      expect(PolicyAcceptanceGate.isSatisfiedFor('user-1'), isTrue);
      expect(PolicyAcceptanceGate.isSatisfiedFor('user-2'), isFalse);
    });

    test('reset clears satisfied session', () {
      PolicyAcceptanceGate.markSatisfied('user-1');
      PolicyAcceptanceGate.resetSession();
      expect(PolicyAcceptanceGate.isSatisfiedFor('user-1'), isFalse);
    });
  });
}
