import 'package:dio/dio.dart';

/// Maps a [DioException] to a user-visible message.
/// Does not include tokens, passwords, or raw request bodies.
String messageFromDio(
  Object error, {
  required String fallback,
}) {
  if (error is! DioException) {
    final text = error.toString().trim();
    if (text.isEmpty || text == 'Exception') {
      return fallback;
    }
    if (text.startsWith('Exception: ')) {
      final stripped = text.substring('Exception: '.length).trim();
      return stripped.isEmpty ? fallback : stripped;
    }
    return text;
  }

  final status = error.response?.statusCode;
  if (status == 429) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'The request timed out. Check your connection and try again.';
    case DioExceptionType.connectionError:
      return 'Could not reach the server. Check your connection and try again.';
    default:
      break;
  }

  final data = error.response?.data;
  if (data is Map) {
    final raw = data['message'];
    if (raw is String && raw.trim().isNotEmpty) {
      return raw.trim();
    }
    if (raw is List && raw.isNotEmpty) {
      return raw.map((item) => item.toString()).where((item) => item.isNotEmpty).join('\n');
    }
  }

  if (status != null) {
    return '$fallback (HTTP $status)';
  }

  return fallback;
}
