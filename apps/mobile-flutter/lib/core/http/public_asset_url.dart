import '../config/api_config.dart';

const privateHosts = {
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.0.2.2',
  'host.docker.internal',
};

/// Rewrites localhost, Docker, relative, and duplicated `/api/v1` asset URLs
/// to the mobile API origin used by this build.
String rewritePublicAssetUrl(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) {
    return trimmed;
  }

  late final Uri api;
  try {
    api = Uri.parse(ApiConfig.apiBaseUrl);
  } catch (_) {
    return trimmed;
  }

  final origin = api.hasPort && !_isDefaultPort(api)
      ? '${api.scheme}://${api.host}:${api.port}'
      : '${api.scheme}://${api.host}';

  if (trimmed.startsWith('/')) {
    return _collapseDuplicateApiPrefix('$origin$trimmed');
  }

  final parsed = Uri.tryParse(trimmed);
  if (parsed == null || !parsed.hasScheme) {
    final key = trimmed.replaceFirst(RegExp(r'^/+'), '').replaceFirst(
          RegExp(r'^api/v\d+/', caseSensitive: false),
          '',
        );
    final path = key.startsWith('uploads/') ? key : 'uploads/$key';
    return _collapseDuplicateApiPrefix('$origin/api/v1/$path');
  }

  if (parsed.host.isEmpty) {
    return trimmed;
  }

  if (privateHosts.contains(parsed.host)) {
    final suffix = parsed.hasQuery ? '${parsed.path}?${parsed.query}' : parsed.path;
    return _collapseDuplicateApiPrefix('$origin$suffix');
  }

  return _collapseDuplicateApiPrefix(trimmed);
}

String? rewritePublicAssetUrlOrNull(String? raw) {
  if (raw == null) {
    return null;
  }
  final rewritten = rewritePublicAssetUrl(raw);
  return rewritten.isEmpty ? null : rewritten;
}

bool isPlayableNetworkUrl(String raw) {
  final uri = Uri.tryParse(raw.trim());
  if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
    return false;
  }
  return uri.scheme == 'http' || uri.scheme == 'https';
}

bool _isDefaultPort(Uri uri) {
  if (!uri.hasPort) {
    return true;
  }
  if (uri.scheme == 'https' && uri.port == 443) {
    return true;
  }
  if (uri.scheme == 'http' && uri.port == 80) {
    return true;
  }
  return false;
}

String _collapseDuplicateApiPrefix(String url) {
  return url.replaceAllMapped(
    RegExp(r'(/api/v\d+)(?:/api/v\d+)+', caseSensitive: false),
    (match) => match.group(1) ?? match.group(0)!,
  );
}
