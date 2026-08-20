import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/http/api_error.dart';
import 'package:ministry_mobile/widgets/clip_video_player.dart';

void main() {
  testWidgets('clip player shows loading, error, and retry', (tester) async {
    var retried = false;
    await tester.pumpWidget(
      MaterialApp(
        home: ClipVideoPlayer(
          initializing: true,
          error: null,
          onRetry: () {},
          onPlayPause: () {},
        ),
      ),
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        home: ClipVideoPlayer(
          initializing: false,
          error: 'This clip video is not available.',
          onRetry: () => retried = true,
          onPlayPause: () {},
        ),
      ),
    );
    expect(find.text('This clip video is not available.'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    expect(retried, isTrue);
  });

  test('parses JSON error bodies returned as PDF download bytes', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/ebooks/1/stream'),
      response: Response<List<int>>(
        requestOptions: RequestOptions(path: '/ebooks/1/stream'),
        statusCode: 404,
        data: utf8.encode(
          jsonEncode({
            'code': 'EBOOK_FILE_MISSING',
            'message': 'This eBook file is not available on the server.',
          }),
        ),
      ),
      type: DioExceptionType.badResponse,
    );

    expect(
      messageFromDio(error, fallback: 'Unable to open this eBook PDF.'),
      'This eBook file is not available on the server.',
    );
  });
}
