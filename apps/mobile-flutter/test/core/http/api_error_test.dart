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
}
