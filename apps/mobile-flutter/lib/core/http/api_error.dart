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
  final extracted = _extractApiMessage(data);
  if (extracted != null) {
    return extracted;
  }

  if (status != null) {
    return '$fallback (HTTP $status)';
  }

  return fallback;
}

String? _extractApiMessage(dynamic data) {
  if (data is Map) {
    final raw = data['message'];
    if (raw is String && raw.trim().isNotEmpty) {
      return raw.trim();
    }
    if (raw is List && raw.isNotEmpty) {
      final joined = raw
          .map((item) => item.toString())
          .where((item) => item.isNotEmpty)
          .join('\n');
      if (joined.isNotEmpty) {
        return joined;
      }
    }
    if (raw is Map) {
      final nested = raw['message'];
      if (nested is String && nested.trim().isNotEmpty) {
        return nested.trim();
      }
    }
  }
  return null;
}

int? apiHttpStatus(Object error) {
  if (error is DioException) {
    return error.response?.statusCode;
  }
  return null;
}

/// Nest/Dio error code when the backend sends `{ message: { code, message } }`.
String? apiErrorCode(Object error) {
  if (error is! DioException) {
    return null;
  }
  final data = error.response?.data;
  if (data is! Map) {
    return null;
  }
  final code = data['code'];
  if (code is String && code.trim().isNotEmpty) {
    return code.trim();
  }
  final message = data['message'];
  if (message is Map) {
    final nested = message['code'];
    if (nested is String && nested.trim().isNotEmpty) {
      return nested.trim();
    }
  }
  return null;
}
