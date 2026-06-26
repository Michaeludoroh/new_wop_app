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
    this.userRsvpStatus,
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
  final String? userRsvpStatus;

  bool get isRsvped => userRsvpStatus == 'REGISTERED';

  EventItem copyWith({
    String? id,
    String? title,
    String? slug,
    String? description,
    String? category,
    String? bannerImageUrl,
    String? locationType,
    String? venue,
    String? meetingLink,
    DateTime? startDateTime,
    DateTime? endDateTime,
    bool? registrationRequired,
    int? maxCapacity,
    int? attendeeCount,
    bool? featured,
    bool? published,
    String? userRsvpStatus,
    bool clearUserRsvpStatus = false,
  }) {
    return EventItem(
      id: id ?? this.id,
      title: title ?? this.title,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      category: category ?? this.category,
      bannerImageUrl: bannerImageUrl ?? this.bannerImageUrl,
      locationType: locationType ?? this.locationType,
      venue: venue ?? this.venue,
      meetingLink: meetingLink ?? this.meetingLink,
      startDateTime: startDateTime ?? this.startDateTime,
      endDateTime: endDateTime ?? this.endDateTime,
      registrationRequired: registrationRequired ?? this.registrationRequired,
      maxCapacity: maxCapacity ?? this.maxCapacity,
      attendeeCount: attendeeCount ?? this.attendeeCount,
      featured: featured ?? this.featured,
      published: published ?? this.published,
      userRsvpStatus:
          clearUserRsvpStatus ? null : (userRsvpStatus ?? this.userRsvpStatus),
    );
  }

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
      userRsvpStatus: json['userRsvpStatus']?.toString(),
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

  EventListResponse withRsvpStatuses(Map<String, String?> statusesByEventId) {
    return EventListResponse(
      data: data
          .map(
            (event) => event.copyWith(
              userRsvpStatus: statusesByEventId[event.id],
              clearUserRsvpStatus: !statusesByEventId.containsKey(event.id),
            ),
          )
          .toList(),
      total: total,
      limit: limit,
      offset: offset,
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

class EventRsvpStatusItem {
  const EventRsvpStatusItem({
    required this.eventId,
    required this.status,
    this.registeredAt,
    this.cancelledAt,
  });

  final String eventId;
  final String? status;
  final DateTime? registeredAt;
  final DateTime? cancelledAt;

  bool get isRegistered => status == 'REGISTERED';

  factory EventRsvpStatusItem.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    return EventRsvpStatusItem(
      eventId: data['eventId']?.toString() ?? '',
      status: data['status']?.toString(),
      registeredAt: DateTime.tryParse(data['registeredAt']?.toString() ?? ''),
      cancelledAt: DateTime.tryParse(data['cancelledAt']?.toString() ?? ''),
    );
  }
}

class EventRsvpListResponse {
  const EventRsvpListResponse({required this.data});

  final List<EventRsvpStatusItem> data;

  factory EventRsvpListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['data'] is List ? json['data'] as List : const [];
    return EventRsvpListResponse(
      data: items
          .whereType<Map>()
          .map(
            (item) => EventRsvpStatusItem.fromJson(
              item.map((key, value) => MapEntry(key.toString(), value)),
            ),
          )
          .toList(),
    );
  }

  Map<String, String?> asStatusMap() {
    return {for (final item in data) item.eventId: item.status};
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
              .copyWith(userRsvpStatus: data['status']?.toString() ?? 'REGISTERED')
          : EventItem.fromJson(const {}),
    );
  }
}

class EventCancelRsvpResponse {
  const EventCancelRsvpResponse({
    required this.status,
    required this.event,
  });

  final String? status;
  final EventItem event;

  factory EventCancelRsvpResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map ? json['data'] as Map : json;
    final event = data['event'];
    final status = data['status']?.toString();
    return EventCancelRsvpResponse(
      status: status,
      event: event is Map
          ? EventItem.fromJson(event.map((key, value) => MapEntry(key.toString(), value)))
              .copyWith(userRsvpStatus: status)
          : EventItem.fromJson(const {}),
    );
  }
}
