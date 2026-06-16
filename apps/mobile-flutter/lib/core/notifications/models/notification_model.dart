enum NotificationChannel {
  inApp,
  email,
  sms,
  push,
  unknown,
}

enum NotificationReadState {
  unread,
  read,
  unknown,
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.channel,
    required this.readState,
    required this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String title;
  final String body;
  final NotificationChannel channel;
  final NotificationReadState readState;
  final DateTime createdAt;
  final DateTime? updatedAt;

  bool get isRead => readState == NotificationReadState.read;
  bool get isUnread => readState == NotificationReadState.unread;

  AppNotification copyWith({
    String? id,
    String? title,
    String? body,
    NotificationChannel? channel,
    NotificationReadState? readState,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      channel: channel ?? this.channel,
      readState: readState ?? this.readState,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final id = (json['id'] ?? '').toString();
    final title = (json['title'] ?? '').toString();
    final body = (json['body'] ?? '').toString();
    final channel = _parseChannel(json['channel']);
    final readState = json['isRead'] is bool
        ? ((json['isRead'] as bool)
            ? NotificationReadState.read
            : NotificationReadState.unread)
        : _parseReadState(json['readState'] ?? json['status']);
    final createdAt = _parseDate(json['createdAt']) ?? DateTime.now().toUtc();
    final updatedAt = _parseDate(json['updatedAt']);

    return AppNotification(
      id: id,
      title: title,
      body: body,
      channel: channel,
      readState: readState,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  static NotificationChannel _parseChannel(dynamic value) {
    final raw = (value ?? '').toString().toUpperCase();
    switch (raw) {
      case 'IN_APP':
        return NotificationChannel.inApp;
      case 'EMAIL':
        return NotificationChannel.email;
      case 'SMS':
        return NotificationChannel.sms;
      case 'PUSH':
        return NotificationChannel.push;
      default:
        return NotificationChannel.unknown;
    }
  }

  static NotificationReadState _parseReadState(dynamic value) {
    final raw = (value ?? '').toString().toUpperCase();
    switch (raw) {
      case 'READ':
        return NotificationReadState.read;
      case 'UNREAD':
        return NotificationReadState.unread;
      default:
        return NotificationReadState.unknown;
    }
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final raw = value.toString();
    return DateTime.tryParse(raw)?.toUtc();
  }
}

class NotificationPageResult {
  const NotificationPageResult({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.hasNextPage,
  });

  final List<AppNotification> items;
  final int page;
  final int limit;
  final int total;
  final bool hasNextPage;

  int get unreadCount => items
      .where((item) => item.readState == NotificationReadState.unread)
      .length;

  factory NotificationPageResult.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] is List
        ? json['items'] as List<dynamic>
        : (json['data'] is List ? json['data'] as List<dynamic> : <dynamic>[]);

    final items = rawItems
        .whereType<Map>()
        .map((e) => e.map((k, v) => MapEntry(k.toString(), v)))
        .map(AppNotification.fromJson)
        .toList(growable: false);

    final offset = _intFrom(json['offset']) ?? 0;
    final limit = _intFrom(json['limit']) ?? items.length;
    final total = _intFrom(json['total']) ?? items.length;
    final page = limit > 0 ? (offset ~/ limit) + 1 : 1;
    final hasNextPage = json['hasNextPage'] == true || page * limit < total;

    return NotificationPageResult(
      items: items,
      page: page,
      limit: limit,
      total: total,
      hasNextPage: hasNextPage,
    );
  }

  static int? _intFrom(dynamic value) {
    if (value is int) return value;
    return int.tryParse((value ?? '').toString());
  }
}
