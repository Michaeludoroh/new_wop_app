import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/http/api_error.dart';

void main() {
  test('extracts nested NestJS { message: { code, message } } bodies', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/mobile/subscriptions/apple/verify'),
      response: Response<dynamic>(
        requestOptions: RequestOptions(path: '/mobile/subscriptions/apple/verify'),
        statusCode: 401,
        data: {
          'statusCode': 401,
          'message': {
            'code': 'APPLE_VERIFICATION_FAILED',
            'message': 'Apple receipt verification failed (status 21002)',
          },
          'error': 'Unauthorized',
        },
      ),
      type: DioExceptionType.badResponse,
    );

    expect(
      messageFromDio(error, fallback: 'Purchase verification failed'),
      'Apple receipt verification failed (status 21002)',
    );
    expect(apiErrorCode(error), 'APPLE_VERIFICATION_FAILED');
    expect(apiHttpStatus(error), 401);
  });

  test('loginErrorMessage maps 401 to invalid credentials without secrets', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/auth/login'),
      type: DioExceptionType.badResponse,
      response: Response<dynamic>(
        requestOptions: RequestOptions(path: '/auth/login'),
        statusCode: 401,
        data: {'message': 'Bearer abc.def.ghi'},
      ),
    );

    expect(loginErrorMessage(error), 'Invalid email or password.');
    expect(loginErrorMessage(error).toLowerCase().contains('bearer'), isFalse);
  });

  test('loginErrorMessage maps timeouts and connection failures', () {
    expect(
      loginErrorMessage(
        DioException(
          requestOptions: RequestOptions(path: '/auth/login'),
          type: DioExceptionType.receiveTimeout,
        ),
      ),
      'The request timed out. Check your connection and try again.',
    );
    expect(
      loginErrorMessage(
        DioException(
          requestOptions: RequestOptions(path: '/auth/login'),
          type: DioExceptionType.connectionError,
        ),
      ),
      'Could not reach the server. Check your connection and try again.',
    );
  });

  test('sanitizeUserFacingError hides tokens and passwords', () {
    expect(
      sanitizeUserFacingError(
        'Authorization: Bearer secret-token',
        fallback: 'Unable to complete that request. Please try again.',
      ),
      'Unable to complete that request. Please try again.',
    );
  });
}
