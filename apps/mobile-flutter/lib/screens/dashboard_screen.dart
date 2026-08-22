import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/clips/clip_service.dart';
import '../core/ebooks/ebook_service.dart';
import '../core/events/event_service.dart';
import '../core/homepage/homepage_feed_sources.dart';
import '../core/notifications/push_notification_router.dart';
import '../core/notifications/providers/notifications_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/homepage/homepage_feed.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/subscription_gate.dart';
import 'notifications_screen.dart';
import 'ebook_screen.dart';
import 'my_library_screen.dart';
import 'clips_screen.dart';
import 'events_screen.dart';
import 'more_screen.dart';
import 'profile_screen.dart';
import '../core/policies/policy_acceptance_gate.dart';
import '../widgets/trial_banner.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.authStatusLabel,
    this.authError,
    this.homepageSources,
    this.eventService,
    this.clipService,
    this.libraryService,
  });

  final String authStatusLabel;
  final String? authError;
  final HomepageFeedSources? homepageSources;
  final EventService? eventService;
  final ClipService? clipService;
  final EbookService? libraryService;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
  late final NotificationsProvider _notificationsProvider;
  int _selectedIndex = 0;
  final Set<int> _builtTabs = {0};
  Widget? _eventsTab;
  Widget? _clipsTab;
  Widget? _libraryTab;
  StreamSubscription<RemoteMessage>? _foregroundPushSub;
  StreamSubscription<RemoteMessage>? _openedPushSub;

  static const List<_DashboardTabItem> _tabs = [
    _DashboardTabItem(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
    ),
    _DashboardTabItem(
      label: 'Events',
      icon: Icons.event_outlined,
      selectedIcon: Icons.event,
    ),
    _DashboardTabItem(
      label: 'Clips',
      icon: Icons.video_library_outlined,
      selectedIcon: Icons.video_library,
    ),
    _DashboardTabItem(
      label: 'Library',
      icon: Icons.library_books_outlined,
      selectedIcon: Icons.library_books,
    ),
    _DashboardTabItem(
      label: 'More',
      icon: Icons.more_horiz,
      selectedIcon: Icons.more_horiz,
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _notificationsProvider = NotificationsProvider()..initialize();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final userId = AuthScope.of(context).state.user?.id;
      if (userId == null || userId.isEmpty) return;
      maybePromptPolicyAcceptance(context: context, userId: userId);
      _bindPushNotifications();
    });
  }

  void _bindPushNotifications() {
    final messaging = AuthScope.read(context).firebaseMessagingService;
    _foregroundPushSub ??= messaging.foregroundMessages.listen((message) {
      if (!mounted) return;
      final route = PushNotificationRouter.resolveRoute(message.data);
      final title = message.notification?.title ??
          message.data['title'] ??
          'Notification';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(title.toString()),
          action: route == null
              ? null
              : SnackBarAction(
                  label: 'Open',
                  onPressed: () => _navigateToPushRoute(route),
                ),
        ),
      );
    });
    _openedPushSub ??= messaging.openedMessages.listen((message) {
      if (!mounted) return;
      final route = PushNotificationRouter.resolveRoute(message.data);
      if (route != null) {
        _navigateToPushRoute(route);
      }
    });
    messaging.markOpenedMessageListenersReady();
  }

  void _navigateToPushRoute(PushNotificationRoute route) {
    Navigator.of(context).pushNamed(route.name, arguments: route.arguments);
  }

  @override
  void dispose() {
    _foregroundPushSub?.cancel();
    _openedPushSub?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _notificationsProvider.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _notificationsProvider.refresh();
      SubscriptionScope.maybeOf(context)?.refresh();
    }
  }

  Future<void> _logout(BuildContext context) async {
    await AuthScope.read(context).logout();
  }

  Future<void> _openNotifications(BuildContext context) async {
    await Navigator.of(context).pushNamed(NotificationsScreen.routeName);
    await _notificationsProvider.refresh();
  }

  void _onDestinationSelected(int index) {
    if (_selectedIndex == index) return;
    setState(() {
      _selectedIndex = index;
      _builtTabs.add(index);
    });
  }

  Widget _homeTab({required String userDisplayName}) {
    return Column(
      children: [
        if (widget.authError != null && widget.authError!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(
              'Auth error: ${widget.authError}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
            ),
          ),
        Expanded(
          child: HomepageFeed(
            sources: widget.homepageSources,
            memberName: userDisplayName,
          ),
        ),
      ],
    );
  }

  Widget _tabAt(int index, {required String userDisplayName}) {
    switch (index) {
      case 0:
        return _homeTab(userDisplayName: userDisplayName);
      case 1:
        return _eventsTab ??= EventsScreen(
          key: const Key('dashboard_events_content'),
          service: widget.eventService,
          embedded: true,
        );
      case 2:
        return _clipsTab ??= SubscriptionGate(
          child: ClipsScreen(
            key: const Key('dashboard_clips_content'),
            service: widget.clipService,
            embedded: true,
          ),
        );
      case 3:
        return _libraryTab ??= MyLibraryScreen(
          key: const Key('dashboard_library_content'),
          service: widget.libraryService,
          embedded: true,
        );
      case 4:
        return const MoreScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = AuthScope.of(context).state;
    final user = authState.user;
    final userDisplayName =
        (user?.name != null && user!.name!.trim().isNotEmpty)
            ? user.name!.trim()
            : user?.email ?? 'Member';

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(),
        actions: [
          AnimatedBuilder(
            animation: _notificationsProvider,
            builder: (context, _) {
              final unreadCount = _notificationsProvider.state.unreadCount;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    tooltip: 'Notifications',
                    onPressed: () => _openNotifications(context),
                    icon: const Icon(Icons.notifications_outlined),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: AppTheme.notificationBadgeDecoration,
                        child: Text(
                          unreadCount > 99 ? '99+' : '$unreadCount',
                          style: AppTheme.notificationBadgeTextStyle,
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          if (_selectedIndex == 3)
            TextButton(
              onPressed: () =>
                  Navigator.of(context).pushNamed(EbookScreen.routeName),
              child: const Text('Browse eBooks'),
            ),
          IconButton(
            tooltip: 'Profile',
            onPressed: () =>
                Navigator.of(context).pushNamed(ProfileScreen.routeName),
            icon: const Icon(Icons.person_outline),
          ),
          IconButton(
            key: const Key('home_logout_button'),
            tooltip: 'Logout',
            onPressed: () => _logout(context),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: IndexedStack(
          sizing: StackFit.expand,
          index: _selectedIndex,
          children: [
            for (var i = 0; i < _tabs.length; i++)
              _builtTabs.contains(i)
                  ? _tabAt(i, userDisplayName: userDisplayName)
                  : const SizedBox.shrink(),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onDestinationSelected,
        destinations: _tabs
            .map(
              (tab) => NavigationDestination(
                icon: Icon(tab.icon),
                selectedIcon: Icon(tab.selectedIcon),
                label: tab.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _DashboardTabItem {
  const _DashboardTabItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
