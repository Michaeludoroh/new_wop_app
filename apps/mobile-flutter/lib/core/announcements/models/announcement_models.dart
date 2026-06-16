class AnnouncementItem {
  const AnnouncementItem({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.status,
    required this.isPublished,
    this.imageUrl,
    this.publishedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String title;
  final String content;
  final String category;
  final String status;
  final bool isPublished;
  final String? imageUrl;
  final DateTime? publishedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get categoryLabel {
    return category
        .split('_')
        .map((part) =>
            part.isEmpty ? part : part[0].toUpperCase() + part.substring(1).toLowerCase())
        .join(' ');
  }

  String get dateLabel {
    final value = publishedAt ?? createdAt;
    if (value == null) return 'Recently updated';
    return '${value.toLocal()}'.split('.').first;
  }

  factory AnnouncementItem.fromJson(Map<String, dynamic> json) {
    return AnnouncementItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      category: json['category']?.toString() ?? 'GENERAL_UPDATE',
      status: json['status']?.toString() ?? 'DRAFT',
      isPublished: json['isPublished'] == true,
      imageUrl: json['imageUrl']?.toString(),
      publishedAt: _parseDate(json['publishedAt']),
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }
}

class AnnouncementListResponse {
  const AnnouncementListResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
  });

  final List<AnnouncementItem> data;
  final int total;
  final int page;
  final int limit;

  factory AnnouncementListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['data'];
    final meta = json['meta'] as Map<String, dynamic>? ?? const {};
    return AnnouncementListResponse(
      data: items is List
          ? items
              .whereType<Map>()
              .map((item) => AnnouncementItem.fromJson(item.cast<String, dynamic>()))
              .toList()
          : const [],
      total: _asInt(meta['total'] ?? json['total']),
      page: _asInt(meta['page'] ?? json['page'], fallback: 1),
      limit: _asInt(meta['limit'] ?? json['limit'], fallback: 20),
    );
  }

  static int _asInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }
}

class AnnouncementDetailsResponse {
  const AnnouncementDetailsResponse({required this.data});

  final AnnouncementItem data;

  factory AnnouncementDetailsResponse.fromJson(Map<String, dynamic> json) {
    final payload = json['data'] is Map<String, dynamic>
        ? json['data'] as Map<String, dynamic>
        : json;
    return AnnouncementDetailsResponse(
      data: AnnouncementItem.fromJson(payload),
    );
  }
}

class AnnouncementCategoryOption {
  const AnnouncementCategoryOption({required this.value, required this.label});

  final String value;
  final String label;

  factory AnnouncementCategoryOption.fromJson(Map<String, dynamic> json) {
    return AnnouncementCategoryOption(
      value: json['value']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
    );
  }
}
