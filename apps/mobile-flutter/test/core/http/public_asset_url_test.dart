import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/http/public_asset_url.dart';

void main() {
  test('leaves public CDN URLs unchanged', () {
    expect(
      rewritePublicAssetUrl('https://cdn.example.com/clips/faith.mp4'),
      'https://cdn.example.com/clips/faith.mp4',
    );
  });

  test('collapses duplicated /api/v1 prefixes', () {
    expect(
      rewritePublicAssetUrl(
        'https://woppandmopp.com/api/v1/api/v1/ebooks/1/stream?token=abc',
      ),
      'https://woppandmopp.com/api/v1/ebooks/1/stream?token=abc',
    );
  });

  test('rejects empty or non-http playback URLs', () {
    expect(isPlayableNetworkUrl(''), isFalse);
    expect(isPlayableNetworkUrl('/uploads/clips/a.mp4'), isFalse);
    expect(isPlayableNetworkUrl('https://woppandmopp.com/api/v1/uploads/clips/a.mp4'), isTrue);
  });
}
