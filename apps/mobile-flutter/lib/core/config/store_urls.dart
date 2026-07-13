/// Public URLs used for App Store / Play Store listings and in-app legal links.
abstract final class StoreUrls {
  static const String _envPrivacyPolicyUrl = String.fromEnvironment(
    'PRIVACY_POLICY_URL',
    defaultValue: 'https://woppandmopp.com/privacy-policy',
  );
  static const String _envTermsOfServiceUrl = String.fromEnvironment(
    'TERMS_OF_SERVICE_URL',
    defaultValue: 'https://woppandmopp.com/terms-of-service',
  );
  static const String _envSupportUrl = String.fromEnvironment(
    'SUPPORT_URL',
    defaultValue: 'https://woppandmopp.com/support',
  );
  static const String _envAccountDeletionUrl = String.fromEnvironment(
    'ACCOUNT_DELETION_URL',
    defaultValue: 'https://woppandmopp.com/account-deletion',
  );
  static const String _envSupportEmail =
      String.fromEnvironment('SUPPORT_EMAIL', defaultValue: 'support@wopp.org');

  static String get privacyPolicyUrl => _envPrivacyPolicyUrl.trim();

  static String get termsOfServiceUrl => _envTermsOfServiceUrl.trim();

  static String get supportUrl => _envSupportUrl.trim();

  static String get accountDeletionUrl => _envAccountDeletionUrl.trim();

  static String get supportEmail => _envSupportEmail;
}
