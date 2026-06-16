class MentorProfile {
  const MentorProfile({
    this.name,
    this.bio,
    this.imageUrl,
    this.category,
  });

  final String? name;
  final String? bio;
  final String? imageUrl;
  final String? category;

  factory MentorProfile.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const MentorProfile();
    return MentorProfile(
      name: json['name']?.toString(),
      bio: json['bio']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      category: json['category']?.toString(),
    );
  }
}

class MentorshipItem {
  const MentorshipItem({
    required this.id,
    required this.title,
    required this.slug,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.enrolledCount,
    required this.waitlistCount,
    required this.featured,
    required this.published,
    required this.mentor,
    this.description,
    this.bannerImageUrl,
    this.mentorName,
    this.mentorBio,
    this.mentorImageUrl,
    this.registrationDeadline,
    this.capacity,
    this.sessionCount,
    this.feedbackCount,
  });

  final String id;
  final String title;
  final String slug;
  final String? description;
  final String category;
  final String? bannerImageUrl;
  final String? mentorName;
  final String? mentorBio;
  final String? mentorImageUrl;
  final MentorProfile mentor;
  final DateTime startDate;
  final DateTime endDate;
  final DateTime? registrationDeadline;
  final int? capacity;
  final int enrolledCount;
  final int waitlistCount;
  final int? sessionCount;
  final int? feedbackCount;
  final bool featured;
  final bool published;

  factory MentorshipItem.fromJson(Map<String, dynamic> json) {
    final mentorJson = json['mentor'];
    return MentorshipItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled class',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      category: json['category']?.toString() ?? 'GENERAL',
      bannerImageUrl: json['bannerImageUrl']?.toString(),
      mentorName: json['mentorName']?.toString(),
      mentorBio: json['mentorBio']?.toString(),
      mentorImageUrl: json['mentorImageUrl']?.toString(),
      mentor: mentorJson is Map
          ? MentorProfile.fromJson(mentorJson.map((k, v) => MapEntry(k.toString(), v)))
          : MentorProfile(
              name: json['mentorName']?.toString(),
              bio: json['mentorBio']?.toString(),
              imageUrl: json['mentorImageUrl']?.toString(),
              category: json['category']?.toString(),
            ),
      startDate: DateTime.tryParse(json['startDate']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      endDate: DateTime.tryParse(json['endDate']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      registrationDeadline: DateTime.tryParse(json['registrationDeadline']?.toString() ?? ''),
      capacity: _asInt(json['capacity']),
      enrolledCount: _asInt(json['enrolledCount']) ?? 0,
      waitlistCount: _asInt(json['waitlistCount']) ?? 0,
      sessionCount: _asInt(json['sessionCount']),
      feedbackCount: _asInt(json['feedbackCount']),
      featured: json['featured'] == true,
      published: json['published'] == true,
    );
  }

  String get dateLabel {
    final local = startDate.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
  }

  String get mentorLabel => mentor.name ?? mentorName ?? 'Mentor';

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

class MentorshipListResponse {
  const MentorshipListResponse({
    required this.data,
    required this.total,
    required this.limit,
    required this.offset,
  });

  final List<MentorshipItem> data;
  final int total;
  final int limit;
  final int offset;

  factory MentorshipListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['data'] is List ? json['data'] as List : const [];
    return MentorshipListResponse(
      data: items
          .whereType<Map>()
          .map((item) => MentorshipItem.fromJson(item.map((k, v) => MapEntry(k.toString(), v))))
          .toList(),
      total: MentorshipItem._asInt(json['total']) ?? items.length,
      limit: MentorshipItem._asInt(json['limit']) ?? items.length,
      offset: MentorshipItem._asInt(json['offset']) ?? 0,
    );
  }
}

class MentorshipDetailsResponse {
  const MentorshipDetailsResponse({required this.data});
  final MentorshipItem data;

  factory MentorshipDetailsResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is Map) {
      return MentorshipDetailsResponse(
        data: MentorshipItem.fromJson(data.map((k, v) => MapEntry(k.toString(), v))),
      );
    }
    return MentorshipDetailsResponse(data: MentorshipItem.fromJson(json));
  }
}

class MentorshipSessionItem {
  const MentorshipSessionItem({
    required this.id,
    required this.title,
    required this.scheduledAt,
    required this.durationMinutes,
    this.description,
    this.meetingLink,
    this.location,
  });

  final String id;
  final String title;
  final String? description;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String? meetingLink;
  final String? location;

  factory MentorshipSessionItem.fromJson(Map<String, dynamic> json) {
    return MentorshipSessionItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Session',
      description: json['description']?.toString(),
      scheduledAt: DateTime.tryParse(json['scheduledAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      durationMinutes: MentorshipItem._asInt(json['durationMinutes']) ?? 60,
      meetingLink: json['meetingLink']?.toString(),
      location: json['location']?.toString(),
    );
  }

  String get scheduleLabel {
    final local = scheduledAt.toLocal();
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}

class MentorshipEnrollmentResponse {
  const MentorshipEnrollmentResponse({required this.id, required this.status});
  final String id;
  final String status;

  factory MentorshipEnrollmentResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    return MentorshipEnrollmentResponse(
      id: data['id']?.toString() ?? '',
      status: data['status']?.toString() ?? 'ENROLLED',
    );
  }
}

class MentorshipProgressItem {
  const MentorshipProgressItem({
    required this.mentorshipClassId,
    required this.completionPct,
    this.currentMilestone,
    this.notes,
    this.lastUpdatedAt,
  });

  final String mentorshipClassId;
  final double completionPct;
  final String? currentMilestone;
  final String? notes;
  final DateTime? lastUpdatedAt;

  factory MentorshipProgressItem.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    return MentorshipProgressItem(
      mentorshipClassId: data['mentorshipClassId']?.toString() ?? '',
      completionPct: _asDouble(data['completionPct']) ?? 0,
      currentMilestone: data['currentMilestone']?.toString(),
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

class MentorshipAttendanceItem {
  const MentorshipAttendanceItem({
    required this.id,
    required this.status,
    required this.markedAt,
    required this.session,
  });

  final String id;
  final String status;
  final DateTime markedAt;
  final MentorshipSessionItem session;

  factory MentorshipAttendanceItem.fromJson(Map<String, dynamic> json) {
    final session = json['session'];
    return MentorshipAttendanceItem(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PRESENT',
      markedAt: DateTime.tryParse(json['markedAt']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      session: session is Map
          ? MentorshipSessionItem.fromJson(session.map((k, v) => MapEntry(k.toString(), v)))
          : MentorshipSessionItem.fromJson(const {}),
    );
  }
}
