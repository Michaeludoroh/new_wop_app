class ProgramItem {
  const ProgramItem({
    required this.id,
    required this.title,
    required this.slug,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.enrolledCount,
    required this.featured,
    required this.published,
    this.description,
    this.bannerImageUrl,
    this.instructorName,
    this.registrationDeadline,
    this.capacity,
  });

  final String id;
  final String title;
  final String slug;
  final String? description;
  final String category;
  final String? bannerImageUrl;
  final String? instructorName;
  final DateTime startDate;
  final DateTime endDate;
  final DateTime? registrationDeadline;
  final int? capacity;
  final int enrolledCount;
  final bool featured;
  final bool published;

  factory ProgramItem.fromJson(Map<String, dynamic> json) {
    return ProgramItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled program',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      category: json['category']?.toString() ?? 'GENERAL',
      bannerImageUrl: json['bannerImageUrl']?.toString(),
      instructorName: json['instructorName']?.toString(),
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      endDate: DateTime.tryParse(json['endDate']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      registrationDeadline: DateTime.tryParse(
        json['registrationDeadline']?.toString() ?? '',
      ),
      capacity: _asInt(json['capacity']),
      enrolledCount: _asInt(json['enrolledCount']) ?? 0,
      featured: json['featured'] == true,
      published: json['published'] == true,
    );
  }

  String get dateLabel {
    final local = startDate.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    return '${local.year}-$month-$day';
  }

  String get instructorLabel => instructorName ?? 'Program facilitator';

  String get capacityLabel {
    if (capacity == null) return '$enrolledCount enrolled';
    return '$enrolledCount / $capacity enrolled';
  }

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}

class ProgramListResponse {
  const ProgramListResponse({
    required this.data,
    required this.total,
    required this.limit,
    required this.offset,
  });

  final List<ProgramItem> data;
  final int total;
  final int limit;
  final int offset;

  factory ProgramListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['data'] is List ? json['data'] as List : const [];
    return ProgramListResponse(
      data: items
          .whereType<Map>()
          .map((item) => ProgramItem.fromJson(item.map((key, value) => MapEntry(key.toString(), value))))
          .toList(),
      total: ProgramItem._asInt(json['total']) ?? items.length,
      limit: ProgramItem._asInt(json['limit']) ?? items.length,
      offset: ProgramItem._asInt(json['offset']) ?? 0,
    );
  }
}

class ProgramDetailsResponse {
  const ProgramDetailsResponse({required this.data});

  final ProgramItem data;

  factory ProgramDetailsResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is Map) {
      return ProgramDetailsResponse(
        data: ProgramItem.fromJson(data.map((key, value) => MapEntry(key.toString(), value))),
      );
    }
    return ProgramDetailsResponse(data: ProgramItem.fromJson(json));
  }
}

class ProgramEnrollmentResponse {
  const ProgramEnrollmentResponse({
    required this.id,
    required this.status,
    required this.program,
  });

  final String id;
  final String status;
  final ProgramItem program;

  factory ProgramEnrollmentResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    final program = data['program'];
    return ProgramEnrollmentResponse(
      id: data['id']?.toString() ?? '',
      status: data['status']?.toString() ?? 'ENROLLED',
      program: program is Map
          ? ProgramItem.fromJson(program.map((key, value) => MapEntry(key.toString(), value)))
          : ProgramItem.fromJson(const {}),
    );
  }
}

class ProgramProgressItem {
  const ProgramProgressItem({
    required this.programId,
    required this.completionPct,
    this.currentModule,
    this.notes,
    this.lastUpdatedAt,
  });

  final String programId;
  final double completionPct;
  final String? currentModule;
  final String? notes;
  final DateTime? lastUpdatedAt;

  factory ProgramProgressItem.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    return ProgramProgressItem(
      programId: data['programId']?.toString() ?? '',
      completionPct: _asDouble(data['completionPct']) ?? 0,
      currentModule: data['currentModule']?.toString(),
      notes: data['notes']?.toString(),
      lastUpdatedAt: DateTime.tryParse(data['lastUpdatedAt']?.toString() ?? ''),
    );
  }

  static double? _asDouble(dynamic value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }
}
