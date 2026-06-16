import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/notifications/push_notification_router.dart';
import '../core/notifications/providers/notifications_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'notifications_screen.dart';
import 'ebook_screen.dart';
import 'my_library_screen.dart';
import 'clips_screen.dart';
import 'events_screen.dart';
import 'more_screen.dart';
import 'profile_screen.dart';
import '../widgets/policy_acceptance_dialog.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.authStatusLabel,
    this.authError,
  });

  final String authStatusLabel;
  final String? authError;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with WidgetsBindingObserver {
  late final NotificationsProvider _notificationsProvider;
  int _selectedIndex = 0;
  StreamSubscription<RemoteMessage>? _foregroundPushSub;
  StreamSubscription<RemoteMessage>? _openedPushSub;

  static const List<_DashboardTabItem> _tabs = [
    _DashboardTabItem(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard,
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
      maybePromptPolicyAcceptance(context: context);
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
    });
  }

  Widget _buildTabContent({
    required BuildContext context,
    required String userDisplayName,
  }) {
    final selectedLabel = _tabs[_selectedIndex].label;

    switch (_selectedIndex) {
      case 0:
        return _TabScaffold(
          title: 'Welcome, $userDisplayName',
          subtitle:
              'You are on the $selectedLabel tab. Auth status: ${widget.authStatusLabel}',
          authError: widget.authError,
          icon: Icons.dashboard_customize_outlined,
        );
      case 1:
        return _TabScaffold(
          title: 'Events',
          subtitle: 'Browse upcoming ministry events and manage your RSVP.',
          authError: widget.authError,
          icon: Icons.event_note_outlined,
          actionLabel: 'Open Events',
          onAction: () =>
              Navigator.of(context).pushNamed(EventsScreen.routeName),
        );
      case 2:
        return _TabScaffold(
          title: 'Clips',
          subtitle:
              'Watch featured ministry clips, teaching highlights, and encouragement.',
          authError: widget.authError,
          icon: Icons.play_circle_outline,
          actionLabel: 'Open Clips',
          onAction: () =>
              Navigator.of(context).pushNamed(ClipsScreen.routeName),
        );
      case 3:
        return _TabScaffold(
          title: 'My Library',
          subtitle: 'Access purchased titles or browse the full eBook catalog.',
          authError: widget.authError,
          icon: Icons.library_books_outlined,
          actionLabel: 'Open Library',
          onAction: () =>
              Navigator.of(context).pushNamed(MyLibraryScreen.routeName),
          secondaryActionLabel: 'Browse eBooks',
          onSecondaryAction: () =>
              Navigator.of(context).pushNamed(EbookScreen.routeName),
        );
      case 4:
        return const MoreScreen();
      default:
        return _TabScaffold(
          title: selectedLabel,
          subtitle: 'Select a tab to continue.',
          authError: widget.authError,
          icon: Icons.dashboard_customize_outlined,
        );
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
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: KeyedSubtree(
            key: ValueKey<int>(_selectedIndex),
            child: _buildTabContent(
              context: context,
              userDisplayName: userDisplayName,
            ),
          ),
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

class _TabScaffold extends StatelessWidget {
  const _TabScaffold({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.authError,
    this.actionLabel,
    this.onAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String? authError;
  final String? actionLabel;
  final VoidCallback? onAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final horizontalPadding =
        MediaQuery.sizeOf(context).width > 600 ? 40.0 : 20.0;

    final colorScheme = Theme.of(context).colorScheme;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPadding,
            vertical: 24,
          ),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 48, color: colorScheme.primary),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: textTheme.headlineSmall?.copyWith(
                      color: colorScheme.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    style: textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  if (actionLabel != null && onAction != null) ...[
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: onAction,
                      child: Text(actionLabel!),
                    ),
                  ],
                  if (secondaryActionLabel != null &&
                      onSecondaryAction != null) ...[
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: onSecondaryAction,
                      child: Text(secondaryActionLabel!),
                    ),
                  ],
                  if (authError != null && authError!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Auth error: $authError',
                      style: textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.error,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
