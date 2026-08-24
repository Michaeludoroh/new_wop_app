import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens the OS app-notification settings. No backend preference API.
class SystemNotificationSettingsLauncher {
  SystemNotificationSettingsLauncher({
    MethodChannel? methodChannel,
    Future<bool> Function(Uri uri)? launchUrlFn,
    bool? isAndroidOverride,
    bool? isIOSOverride,
    bool? isMacOSOverride,
  })  : _methodChannel =
            methodChannel ?? const MethodChannel('wopp/system_settings'),
        _launchUrlFn = launchUrlFn,
        _isAndroidOverride = isAndroidOverride,
        _isIOSOverride = isIOSOverride,
        _isMacOSOverride = isMacOSOverride;

  final MethodChannel _methodChannel;
  final Future<bool> Function(Uri uri)? _launchUrlFn;
  final bool? _isAndroidOverride;
  final bool? _isIOSOverride;
  final bool? _isMacOSOverride;

  bool get _isAndroid =>
      _isAndroidOverride ?? (!kIsWeb && Platform.isAndroid);
  bool get _isIOS => _isIOSOverride ?? (!kIsWeb && Platform.isIOS);
  bool get _isMacOS => _isMacOSOverride ?? (!kIsWeb && Platform.isMacOS);

  Future<bool> open() async {
    try {
      if (_isAndroid) {
        final result = await _methodChannel.invokeMethod<bool>(
          'openNotificationSettings',
        );
        return result ?? false;
      }

      if (_isIOS || _isMacOS) {
        return _launch(Uri.parse('app-settings:'));
      }
    } catch (_) {
      return false;
    }

    return false;
  }

  Future<bool> _launch(Uri uri) async {
    final launcher = _launchUrlFn ??
        ((url) => launchUrl(url, mode: LaunchMode.externalApplication));
    return launcher(uri);
  }
}
