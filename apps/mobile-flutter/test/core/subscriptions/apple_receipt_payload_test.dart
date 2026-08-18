import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/subscriptions/apple_receipt_payload.dart';

void main() {
  test('classifies empty, app receipt, and StoreKit 2 JWS payloads', () {
    expect(looksLikeAppleJws(''), isFalse);
    expect(applePayloadKind(''), 'empty');
    expect(looksLikeAppleJws('MIITqAYJKoZIhvcNAQcC'), isFalse);
    expect(applePayloadKind('MIITqAYJKoZIhvcNAQcC'), 'app_receipt');
    expect(
      looksLikeAppleJws('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature'),
      isTrue,
    );
    expect(
      applePayloadKind('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature'),
      'storekit2_jws',
    );
  });
}
