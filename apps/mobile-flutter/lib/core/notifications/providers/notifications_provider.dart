import 'package:flutter/foundation.dart';

import '../models/notification_model.dart';
import '../services/notifications_service.dart';
import '../services/realtime_notifications_service.dart';

class NotificationsState {
  const NotificationsState({
    required this.items,
    required this.isLoading,
    required this.isRefreshing,
    required this.isFetchingMore,
    required this.page,
    required this.limit,
    required this.hasNextPage,
    required this.unreadCount,
    this.errorMessage,
  });

  final List<AppNotification> items;
  final bool isLoading;
  final bool isRefreshing;
  final bool isFetchingMore;
  final int page;
  final int limit;
  final bool hasNextPage;
  final int unreadCount;
  final String? errorMessage;

  bool get isEmpty => !isLoading && items.isEmpty && errorMessage == null;

  NotificationsState copyWith({
    List<AppNotification>? items,
    bool? isLoading,
    bool? isRefreshing,
    bool? isFetchingMore,
    int? page,
    int? limit,
    bool? hasNextPage,
    int? unreadCount,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isFetchingMore: isFetchingMore ?? this.isFetchingMore,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      hasNextPage: hasNextPage ?? this.hasNextPage,
      unreadCount: unreadCount ?? this.unreadCount,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  factory NotificationsState.initial() {
    return const NotificationsState(
      items: <AppNotification>[],
      isLoading: false,
      isRefreshing: false,
      isFetchingMore: false,
      page: 1,
      limit: 20,
      hasNextPage: false,
      unreadCount: 0,
      errorMessage: null,
    );
  }
}

class NotificationsProvider extends ChangeNotifier {
  NotificationsProvider({
    NotificationsService? service,
    RealtimeNotificationsService? realtimeService,
  })  : _service = service ?? NotificationsService(),
        _realtimeService = realtimeService ?? RealtimeNotificationsService();

  final NotificationsService _service;
  final RealtimeNotificationsService _realtimeService;

  NotificationsState _state = NotificationsState.initial();
  NotificationsState get state => _state;

  Future<void> initialize() async {
    if (_state.isLoading || _state.items.isNotEmpty) return;
    await loadInitial();
    await _startRealtime();
  }

  Future<void> loadInitial() async {
    _setState(
      _state.copyWith(
        isLoading: true,
        clearError: true,
      ),
    );

    try {
      final result = await _service.fetchNotifications(
        page: 1,
        limit: _state.limit,
      );
      _setState(
        _state.copyWith(
          isLoading: false,
          items: result.items,
          page: result.page,
          hasNextPage: result.hasNextPage,
          unreadCount: _countUnread(result.items),
          clearError: true,
        ),
      );
    } catch (e) {
      _setState(
        _state.copyWith(
          isLoading: false,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> refresh() async {
    _setState(
      _state.copyWith(
        isRefreshing: true,
        clearError: true,
      ),
    );

    try {
      final result = await _service.fetchNotifications(
        page: 1,
        limit: _state.limit,
      );

      _setState(
        _state.copyWith(
          isRefreshing: false,
          items: result.items,
          page: result.page,
          hasNextPage: result.hasNextPage,
          unreadCount: _countUnread(result.items),
          clearError: true,
        ),
      );
    } catch (e) {
      _setState(
        _state.copyWith(
          isRefreshing: false,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> fetchNextPage() async {
    if (_state.isFetchingMore || !_state.hasNextPage) return;

    _setState(_state.copyWith(isFetchingMore: true, clearError: true));

    try {
      final nextPage = _state.page + 1;
      final result = await _service.fetchNotifications(
        page: nextPage,
        limit: _state.limit,
      );

      final merged = List<AppNotification>.from(_state.items)
        ..addAll(result.items);

      _setState(
        _state.copyWith(
          isFetchingMore: false,
          items: merged,
          page: result.page,
          hasNextPage: result.hasNextPage,
          unreadCount: _countUnread(merged),
        ),
      );
    } catch (e) {
      _setState(
        _state.copyWith(
          isFetchingMore: false,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> setReadState({
    required String notificationId,
    required bool read,
  }) async {
    final index = _state.items.indexWhere((n) => n.id == notificationId);
    if (index < 0) return;

    final original = _state.items[index];
    final optimistic = original.copyWith(
      readState:
          read ? NotificationReadState.read : NotificationReadState.unread,
    );

    final updatedItems = List<AppNotification>.from(_state.items);
    updatedItems[index] = optimistic;

    _setState(
      _state.copyWith(
        items: updatedItems,
        unreadCount: _countUnread(updatedItems),
        clearError: true,
      ),
    );

    try {
      final persisted = await _service.markReadState(
        id: notificationId,
        read: read,
      );
      final persistedItems = List<AppNotification>.from(_state.items);
      final persistedIndex =
          persistedItems.indexWhere((n) => n.id == notificationId);
      if (persistedIndex >= 0) {
        persistedItems[persistedIndex] = persisted;
      }

      _setState(
        _state.copyWith(
          items: persistedItems,
          unreadCount: _countUnread(persistedItems),
          clearError: true,
        ),
      );
    } catch (e) {
      final rollbackItems = List<AppNotification>.from(_state.items);
      final rollbackIndex =
          rollbackItems.indexWhere((n) => n.id == notificationId);
      if (rollbackIndex >= 0) {
        rollbackItems[rollbackIndex] = original;
      }
      _setState(
        _state.copyWith(
          items: rollbackItems,
          unreadCount: _countUnread(rollbackItems),
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> _startRealtime() async {
    await _realtimeService.start(
      onNotificationCreated: (_) async {
        await refresh();
      },
      onNotificationUpdated: (_) async {
        await refresh();
      },
      onNotificationReadStateChanged: (_) async {
        await refresh();
      },
    );
  }

  @override
  void dispose() {
    _realtimeService.stop();
    super.dispose();
  }

  int _countUnread(List<AppNotification> items) {
    return items
        .where((n) => n.readState == NotificationReadState.unread)
        .length;
  }

  void _setState(NotificationsState value) {
    _state = value;
    notifyListeners();
  }
}
