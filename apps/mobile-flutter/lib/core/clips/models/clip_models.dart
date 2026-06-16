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

  factory ClipItem.fromJson(Map<String, dynamic> json) {
    return ClipItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled clip',
      description: json['description']?.toString(),
      videoUrl: json['videoUrl']?.toString() ?? json['mediaUrl']?.toString() ?? '',
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      category: json['category']?.toString() ?? 'GENERAL',
      durationSeconds: _asInt(json['durationSeconds']),
      speaker: json['speaker']?.toString(),
      scriptureReferences: _asStringList(json['scriptureReferences']),
      tags: _asStringList(json['tags']),
      viewCount: _asInt(json['viewCount']) ?? 0,
      featured: json['featured'] == true,
      isPublished: json['isPublished'] == true || json['status'] == 'PUBLISHED',
      publishedAt: DateTime.tryParse(json['publishedAt']?.toString() ?? ''),
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
    final items = json['data'] is List ? json['data'] as List : const [];
    return ClipListResponse(
      data: items
          .whereType<Map>()
          .map((item) => ClipItem.fromJson(item.map((key, value) => MapEntry(key.toString(), value))))
          .toList(),
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
        data: ClipItem.fromJson(data.map((key, value) => MapEntry(key.toString(), value))),
      );
    }
    return ClipDetailsResponse(data: ClipItem.fromJson(json));
  }
}
