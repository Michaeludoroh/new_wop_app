/// Helpers for Apple StoreKit verification payloads.
/// Never log the payload itself (receipts and JWS tokens are secrets).
bool looksLikeAppleJws(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty || !trimmed.startsWith('eyJ')) {
    return false;
  }
  final parts = trimmed.split('.');
  return parts.length == 3 && parts.every((part) => part.isNotEmpty);
}

String applePayloadKind(String value) {
  if (value.trim().isEmpty) {
    return 'empty';
  }
  if (looksLikeAppleJws(value)) {
    return 'storekit2_jws';
  }
  return 'app_receipt';
}
