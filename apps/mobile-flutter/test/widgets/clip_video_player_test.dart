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

  testWidgets('play/pause control stays compact inside an expanding video stack', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 400,
            height: 225,
            child: Stack(
              alignment: Alignment.center,
              fit: StackFit.expand,
              children: [
                ColoredBox(color: Colors.black),
                Center(child: ClipVideoPlayPauseButton(isPlaying: true)),
              ],
            ),
          ),
        ),
      ),
    );

    final size = tester.getSize(find.byType(ClipVideoPlayPauseButton));
    expect(size.width, ClipVideoPlayPauseButton.diameter);
    expect(size.height, ClipVideoPlayPauseButton.diameter);
    expect(size.width, lessThan(120));
    expect(size.height, lessThan(120));
    expect(find.byType(IconButton), findsNothing);
    expect(find.byIcon(Icons.pause), findsOneWidget);
  });

  testWidgets('clip player does not use a filled IconButton overlay', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ClipVideoPlayer(
          initializing: false,
          error: null,
          onRetry: () {},
          onPlayPause: () {},
        ),
      ),
    );

    expect(find.byType(IconButton), findsNothing);
    expect(find.byType(ClipVideoPlayPauseButton), findsNothing);
  });

  test('restarts playback only after the video has completed', () {
    expect(
      clipPlaybackShouldRestart(
        isPlaying: false,
        position: const Duration(seconds: 30),
        duration: const Duration(seconds: 30),
      ),
      isTrue,
    );
    expect(
      clipPlaybackShouldRestart(
        isPlaying: true,
        position: const Duration(seconds: 30),
        duration: const Duration(seconds: 30),
      ),
      isFalse,
    );
    expect(
      clipPlaybackShouldRestart(
        isPlaying: false,
        position: const Duration(seconds: 12),
        duration: const Duration(seconds: 30),
      ),
      isFalse,
    );
  });
}
