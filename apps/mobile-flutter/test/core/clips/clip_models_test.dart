import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';

void main() {
  test('parses public clip list payloads with videoUrl mapping', () {
    final parsed = ClipListResponse.fromJson({
      'data': [
        {
          'id': 'clip-1',
          'title': 'Faith for Today',
          'videoUrl': 'https://cdn.example.com/clips/faith.mp4',
          'thumbnailUrl': 'https://cdn.example.com/clips/faith.jpg',
          'category': 'TEACHING',
          'viewCount': 4,
          'featured': true,
          'isPublished': true,
          'tags': ['faith'],
          'scriptureReferences': ['Hebrews 11:1'],
        },
      ],
      'total': 1,
      'limit': 20,
      'offset': 0,
    });

    expect(parsed.data, hasLength(1));
    expect(parsed.data.single.id, 'clip-1');
    expect(parsed.data.single.videoUrl, 'https://cdn.example.com/clips/faith.mp4');
    expect(parsed.data.single.hasThumbnail, isTrue);
  });

  test('accepts mediaUrl fallback and nested data wrappers', () {
    final parsed = ClipListResponse.fromJson({
      'data': {
        'data': [
          {
            'id': 'clip-2',
            'title': 'Prayer',
            'mediaUrl': 'https://cdn.example.com/clips/prayer.mp4',
            'thumbnailUrl': '',
            'category': 'PRAYER',
            'featured': false,
            'status': 'PUBLISHED',
          },
        ],
      },
      'total': 1,
    });

    expect(parsed.data.single.videoUrl, 'https://cdn.example.com/clips/prayer.mp4');
    expect(parsed.data.single.hasThumbnail, isFalse);
    expect(parsed.data.single.isPublished, isTrue);
  });
}
