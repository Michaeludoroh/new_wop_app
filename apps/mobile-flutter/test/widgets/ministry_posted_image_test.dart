import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/widgets/ministry_posted_image.dart';

class _NeverCompletingImageProvider extends ImageProvider<_NeverCompletingImageProvider> {
  const _NeverCompletingImageProvider();

  @override
  Future<_NeverCompletingImageProvider> obtainKey(ImageConfiguration configuration) {
    return SynchronousFuture(this);
  }

  @override
  ImageStreamCompleter loadImage(
    _NeverCompletingImageProvider key,
    ImageDecoderCallback decode,
  ) {
    return OneFrameImageStreamCompleter(Completer<ImageInfo>().future);
  }
}

void main() {
  test('preserves portrait, landscape, square, and arbitrary ratios without distortion', () {
    const portrait = Size(100, 200);
    const landscape = Size(200, 100);
    const square = Size(100, 100);
    const arbitrary = Size(300, 100);

    expect(postedImageFittedSize(intrinsic: portrait, maxWidth: 200), const Size(200, 400));
    expect(postedImageFittedSize(intrinsic: landscape, maxWidth: 200), const Size(200, 100));
    expect(postedImageFittedSize(intrinsic: square, maxWidth: 200), const Size(200, 200));
    expect(postedImageFittedSize(intrinsic: arbitrary, maxWidth: 300), const Size(300, 100));

    expect(
      postedImageFittedSize(intrinsic: portrait, maxWidth: 200).width /
          postedImageFittedSize(intrinsic: portrait, maxWidth: 200).height,
      closeTo(portrait.width / portrait.height, 0.0001),
    );
    expect(
      postedImageFittedSize(intrinsic: landscape, maxWidth: 400).width /
          postedImageFittedSize(intrinsic: landscape, maxWidth: 400).height,
      closeTo(landscape.width / landscape.height, 0.0001),
    );
    expect(
      postedImageFittedSize(intrinsic: square, maxWidth: 90).width /
          postedImageFittedSize(intrinsic: square, maxWidth: 90).height,
      closeTo(1.0, 0.0001),
    );
    expect(
      postedImageFittedSize(intrinsic: arbitrary, maxWidth: 150).width /
          postedImageFittedSize(intrinsic: arbitrary, maxWidth: 150).height,
      closeTo(3.0, 0.0001),
    );
  });

  test('letterboxes extremely tall images instead of stretching or cropping', () {
    final fitted = postedImageFittedSize(
      intrinsic: const Size(100, 400),
      maxWidth: 200,
      maxHeight: 200,
    );
    expect(fitted, const Size(50, 200));
    expect(fitted.width / fitted.height, closeTo(100 / 400, 0.0001));
  });

  testWidgets('uses contain, never cover or fill', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MinistryPostedImage(
            url: 'pending://image',
            provider: _NeverCompletingImageProvider(),
          ),
        ),
      ),
    );

    final image = tester.widget<Image>(find.byKey(MinistryPostedImage.imageKey));
    expect(image.fit, BoxFit.contain);
    expect(image.fit, isNot(BoxFit.cover));
    expect(image.fit, isNot(BoxFit.fill));
  });

  testWidgets('shows a loading state while the image is unresolved', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MinistryPostedImage(
            url: 'pending://image',
            provider: _NeverCompletingImageProvider(),
          ),
        ),
      ),
    );

    expect(find.byKey(MinistryPostedImage.loadingKey), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows an error state when no image can be loaded', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: MinistryPostedImage(url: ''),
        ),
      ),
    );

    expect(find.byKey(MinistryPostedImage.errorKey), findsOneWidget);
    expect(find.byKey(MinistryPostedImage.imageKey), findsNothing);
  });
}
