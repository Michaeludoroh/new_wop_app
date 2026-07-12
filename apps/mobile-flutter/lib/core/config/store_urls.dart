import 'api_config.dart';

/// Public URLs used for App Store / Play Store listings and in-app legal links.
abstract final class StoreUrls {
  static const String _envPrivacyPolicyUrl =
      String.fromEnvironment('PRIVACY_POLICY_URL');
  static const String _envTermsOfServiceUrl =
      String.fromEnvironment('TERMS_OF_SERVICE_URL');
  static const String _envSupportUrl = String.fromEnvironment('SUPPORT_URL');
  static const String _envSupportEmail =
      String.fromEnvironment('SUPPORT_EMAIL', defaultValue: 'support@wopp.org');

  static String get privacyPolicyUrl {
    if (_envPrivacyPolicyUrl.trim().isNotEmpty) {
      return _envPrivacyPolicyUrl.trim();
    }
    return '${ApiConfig.apiBaseUrl}/policies/public/current/PRIVACY_POLICY';
  }

  static String get termsOfServiceUrl {
    if (_envTermsOfServiceUrl.trim().isNotEmpty) {
      return _envTermsOfServiceUrl.trim();
    }
    return '${ApiConfig.apiBaseUrl}/policies/public/current/TERMS_OF_USE';
  }

  static String get supportUrl {
    if (_envSupportUrl.trim().isNotEmpty) {
      return _envSupportUrl.trim();
    }
    return 'mailto:$_envSupportEmail';
  }

  static String get supportEmail => _envSupportEmail;
}
