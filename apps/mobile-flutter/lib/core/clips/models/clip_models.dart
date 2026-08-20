import '../../http/public_asset_url.dart';

class ClipItem {
  const ClipItem({
    required this.id,
    required this.title,
    required this.videoUrl,
    required this.category,
    required this.viewCount,
    required this.featured,
    required this.isPublished,
    required this.tags,
    required this.scriptureReferences,
    this.description,
    this.thumbnailUrl,
    this.durationSeconds,
    this.speaker,
    this.publishedAt,
    this.videoAvailable,
  });

  final String id;
  final String title;
  final String? description;
  final String videoUrl;
  final String? thumbnailUrl;
  final String category;
  final int? durationSeconds;
  final String? speaker;
  final List<String> scriptureReferences;
  final List<String> tags;
  final int viewCount;
  final bool featured;
  final bool isPublished;
  final DateTime? publishedAt;
  final bool? videoAvailable;

  bool get hasPlayableVideo => videoAvailable != false && isPlayableNetworkUrl(videoUrl);

  bool get hasThumbnail {
    final url = thumbnailUrl;
    return url != null && url.trim().isNotEmpty;
  }

  factory ClipItem.fromJson(Map<String, dynamic> json) {
    final thumbnail = json['thumbnailUrl']?.toString().trim();
    return ClipItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled clip',
      description: json['description']?.toString(),
      videoUrl: rewritePublicAssetUrl(
        json['videoUrl']?.toString() ?? json['mediaUrl']?.toString() ?? '',
      ),
      thumbnailUrl: rewritePublicAssetUrlOrNull(thumbnail),
      category: json['category']?.toString() ?? 'GENERAL',
      durationSeconds: _asInt(json['durationSeconds']),
      speaker: json['speaker']?.toString(),
      scriptureReferences: _asStringList(json['scriptureReferences']),
      tags: _asStringList(json['tags']),
      viewCount: _asInt(json['viewCount']) ?? 0,
      featured: json['featured'] == true,
      isPublished: json['isPublished'] == true || json['status'] == 'PUBLISHED',
      publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? ''),
      videoAvailable: json['videoAvailable'] is bool ? json['videoAvailable'] as bool : null,
    );
  }

  String get durationLabel {
    final seconds = durationSeconds;
    if (seconds == null || seconds <= 0) return '';
    final minutes = seconds ~/ 60;
    final remainder = seconds % 60;
    return '$minutes:${remainder.toString().padLeft(2, '0')}';
  }

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static List<String> _asStringList(dynamic value) {
    if (value is List) {
      return value.map((item) => item.toString()).where((item) => item.isNotEmpty).toList();
    }
    return const [];
  }

  static Map<String, dynamic> asMap(dynamic value) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }

  static List<ClipItem> parseList(dynamic raw) {
    dynamic items = raw;
    if (raw is Map) {
      final nested = raw['data'];
      items = nested is List ? nested : (nested is Map ? nested['data'] : raw['items']);
    }
    if (items is! List) {
      return const [];
    }

    return items
        .map((item) {
          if (item is Map<String, dynamic>) {
            return ClipItem.fromJson(item);
          }
          if (item is Map) {
            return ClipItem.fromJson(item.map((key, value) => MapEntry(key.toString(), value)));
          }
          return null;
        })
        .whereType<ClipItem>()
        .where((item) => item.id.isNotEmpty)
        .toList();
  }
}

class ClipListResponse {
  const ClipListResponse({
    required this.data,
    required this.total,
    required this.limit,
    required this.offset,
  });

  final List<ClipItem> data;
  final int total;
  final int limit;
  final int offset;

  factory ClipListResponse.fromJson(Map<String, dynamic> json) {
    final items = ClipItem.parseList(json);
    return ClipListResponse(
      data: items,
      total: ClipItem._asInt(json['total']) ?? items.length,
      limit: ClipItem._asInt(json['limit']) ?? items.length,
      offset: ClipItem._asInt(json['offset']) ?? 0,
    );
  }
}

class ClipDetailsResponse {
  const ClipDetailsResponse({required this.data});

  final ClipItem data;

  factory ClipDetailsResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is Map) {
      return ClipDetailsResponse(
        data: ClipItem.fromJson(ClipItem.asMap(data)),
      );
    }
    return ClipDetailsResponse(data: ClipItem.fromJson(json));
  }
}
