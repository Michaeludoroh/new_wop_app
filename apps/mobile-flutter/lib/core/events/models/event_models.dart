class EventItem {
  const EventItem({
    required this.id,
    required this.title,
    required this.slug,
    required this.category,
    required this.locationType,
    required this.startDateTime,
    required this.endDateTime,
    required this.registrationRequired,
    required this.attendeeCount,
    required this.featured,
    required this.published,
    this.description,
    this.bannerImageUrl,
    this.venue,
    this.meetingLink,
    this.maxCapacity,
  });

  final String id;
  final String title;
  final String slug;
  final String? description;
  final String category;
  final String? bannerImageUrl;
  final String locationType;
  final String? venue;
  final String? meetingLink;
  final DateTime startDateTime;
  final DateTime endDateTime;
  final bool registrationRequired;
  final int? maxCapacity;
  final int attendeeCount;
  final bool featured;
  final bool published;

  factory EventItem.fromJson(Map<String, dynamic> json) {
    return EventItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled event',
      slug: json['slug']?.toString() ?? '',
      description: json['description']?.toString(),
      category: json['category']?.toString() ?? 'GENERAL',
      bannerImageUrl: json['bannerImageUrl']?.toString(),
      locationType: json['locationType']?.toString() ?? 'PHYSICAL',
      venue: json['venue']?.toString(),
      meetingLink: json['meetingLink']?.toString(),
      startDateTime: DateTime.tryParse(json['startDateTime']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      endDateTime: DateTime.tryParse(json['endDateTime']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      registrationRequired: json['registrationRequired'] == true,
      maxCapacity: _asInt(json['maxCapacity']),
      attendeeCount: _asInt(json['attendeeCount']) ?? 0,
      featured: json['featured'] == true,
      published: json['published'] == true,
    );
  }

  String get dateLabel {
    final local = startDateTime.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }

  String get locationLabel {
    if (locationType == 'ONLINE') return 'Online';
    if (locationType == 'HYBRID') return venue == null ? 'Hybrid' : 'Hybrid • $venue';
    return venue ?? 'Physical location';
  }

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}

class EventListResponse {
  const EventListResponse({
    required this.data,
    required this.total,
    required this.limit,
    required this.offset,
  });

  final List<EventItem> data;
  final int total;
  final int limit;
  final int offset;

  factory EventListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['data'] is List ? json['data'] as List : const [];
    return EventListResponse(
      data: items
          .whereType<Map>()
          .map((item) => EventItem.fromJson(item.map((key, value) => MapEntry(key.toString(), value))))
          .toList(),
      total: EventItem._asInt(json['total']) ?? items.length,
      limit: EventItem._asInt(json['limit']) ?? items.length,
      offset: EventItem._asInt(json['offset']) ?? 0,
    );
  }
}

class EventDetailsResponse {
  const EventDetailsResponse({required this.data});

  final EventItem data;

  factory EventDetailsResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is Map) {
      return EventDetailsResponse(
        data: EventItem.fromJson(data.map((key, value) => MapEntry(key.toString(), value))),
      );
    }
    return EventDetailsResponse(data: EventItem.fromJson(json));
  }
}

class EventRsvpResponse {
  const EventRsvpResponse({
    required this.id,
    required this.status,
    required this.event,
  });

  final String id;
  final String status;
  final EventItem event;

  factory EventRsvpResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    final event = data['event'];
    return EventRsvpResponse(
      id: data['id']?.toString() ?? '',
      status: data['status']?.toString() ?? 'REGISTERED',
      event: event is Map
          ? EventItem.fromJson(event.map((key, value) => MapEntry(key.toString(), value)))
          : EventItem.fromJson(const {}),
    );
  }
}
