/// Non-secret billing failure that can be shown in the UI.
class MobileBillingException implements Exception {
  MobileBillingException(
    this.message, {
    this.code,
    this.debugDetails,
  });

  final String message;
  final String? code;
  final String? debugDetails;

  @override
  String toString() => message;
}
