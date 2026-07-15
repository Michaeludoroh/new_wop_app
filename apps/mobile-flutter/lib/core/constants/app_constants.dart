/// Application-wide branding and attribution constants.
///
/// Keep [appVersion] and [buildNumber] in sync with `pubspec.yaml` (`version: x.y.z+build`).
abstract final class AppConstants {
  static const appName = 'WOPP';

  /// Full product name used when referring to the mobile app on web and marketing copy.
  static const appProductName = 'WOPP App';

  /// Mobile app acronym expansion (ministry website name remains [organizationName]).
  static const appAcronymExpansion = 'Women of Passion and Purpose';

  /// User-facing tagline for About, auth, and marketing surfaces.
  static const appTagline =
      'WOPP — The official app of Men and Women of Passion and Purpose';

  static const websiteUrl = 'https://woppandmopp.com';

  static const aboutTitle = 'About $appName';

  static const logoSemanticLabel = '$appName logo';

  static const organizationName = 'Men and Women of Passion and Purpose';

  static const developerPrimary = 'Michael Udoroh';

  static const developerSecondary = 'Misan Mayuku Dore';

  static const developersDisplay = '$developerPrimary & $developerSecondary';

  static const appVersion = '0.1.0';

  static const buildNumber = '1';

  static const versionLabel = 'v$appVersion ($buildNumber)';

  static int get copyrightYear => DateTime.now().year;

  static String get copyrightNotice =>
      '© $copyrightYear $organizationName. All rights reserved.';
}
