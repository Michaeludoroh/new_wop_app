import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/clips/clip_service.dart';
import 'package:ministry_mobile/core/clips/models/clip_models.dart';
import 'package:ministry_mobile/screens/clips_screen.dart';

class _FakeClipService extends ClipService {
  _FakeClipService({this.clips = const [], this.throwOnList = false});

  final List<ClipItem> clips;
  final bool throwOnList;

  @override
  Future<ClipListResponse> getClips({
    String? search,
    String? category,
    bool? featured,
    String? sort,
    int limit = 20,
    int offset = 0,
  }) async {
    if (throwOnList) {
      throw ClipServiceException('Failed to load clips. (HTTP 500)');
    }
    return ClipListResponse(data: clips, total: clips.length, limit: limit, offset: offset);
  }

  @override
  Future<ClipListResponse> getFeaturedClips({int limit = 10}) async {
    return ClipListResponse(
      data: clips.where((clip) => clip.featured).toList(),
      total: clips.where((clip) => clip.featured).length,
      limit: limit,
      offset: 0,
    );
  }
}

void main() {
  const sampleClip = ClipItem(
    id: 'clip-1',
    title: 'Faith for Today',
    videoUrl: 'https://cdn.example.com/clips/faith.mp4',
    thumbnailUrl: null,
    category: 'TEACHING',
    viewCount: 3,
    featured: true,
    isPublished: true,
    tags: ['faith'],
    scriptureReferences: ['Hebrews 11:1'],
    speaker: 'Pastor Ada',
  );

  testWidgets('renders loaded clips', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ClipsScreen(service: _FakeClipService(clips: const [sampleClip])),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Latest Clips'), findsOneWidget);
    expect(find.text('Faith for Today'), findsWidgets);
    expect(find.text('No clips found.'), findsNothing);
  });

  testWidgets('renders a useful error state when the list request fails', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ClipsScreen(service: _FakeClipService(throwOnList: true)),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Failed to load clips. (HTTP 500)'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
