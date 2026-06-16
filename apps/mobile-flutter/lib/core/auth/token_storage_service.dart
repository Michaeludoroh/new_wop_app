import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorageService {
  TokenStorageService({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secureStorage;

  static const String _accessTokenKey = 'auth.access_token';
  static const String _refreshTokenKey = 'auth.refresh_token';
  static const String _tokenExpiryIsoKey = 'auth.token_expiry_iso';

  Future<void> saveAccessToken(String token) {
    return _secureStorage.write(key: _accessTokenKey, value: token);
  }

  Future<String?> getAccessToken() {
    return _secureStorage.read(key: _accessTokenKey);
  }

  Future<void> saveRefreshToken(String token) {
    return _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() {
    return _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> saveTokenExpiry(DateTime expiry) {
    return _secureStorage.write(
      key: _tokenExpiryIsoKey,
      value: expiry.toUtc().toIso8601String(),
    );
  }

  Future<DateTime?> getTokenExpiry() async {
    final iso = await _secureStorage.read(key: _tokenExpiryIsoKey);
    if (iso == null || iso.isEmpty) {
      return null;
    }

    final parsed = DateTime.tryParse(iso);
    return parsed?.toUtc();
  }

  Future<void> clearTokenExpiry() {
    return _secureStorage.delete(key: _tokenExpiryIsoKey);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _secureStorage.delete(key: _accessTokenKey),
      _secureStorage.delete(key: _refreshTokenKey),
      _secureStorage.delete(key: _tokenExpiryIsoKey),
    ]);
  }
}
