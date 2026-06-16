import 'package:flutter/material.dart';

import '../core/auth/auth_scope.dart';
import '../core/auth/auth_state.dart';
import '../core/notifications/providers/notifications_provider.dart';
import '../widgets/ministry_app_bar_title.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  static const routeName = '/notifications';

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final NotificationsProvider _provider;

  @override
  void initState() {
    super.initState();
    _provider = NotificationsProvider()..initialize();
  }

  @override
  void dispose() {
    _provider.dispose();
    super.dispose();
  }

  Future<void> _refresh() => _provider.refresh();

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final authState = auth.state;

    if (!authState.isAuthenticated ||
        authState.status != AuthStatus.authenticated) {
      return const Scaffold(
        body: Center(
          child: Text('Unauthorized. Please sign in again.'),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _provider,
      builder: (context, _) {
        final state = _provider.state;

        return Scaffold(
          appBar: AppBar(
            title: const MinistryAppBarTitle(title: 'Notifications'),
          ),
          body: RefreshIndicator(
            onRefresh: _refresh,
            child: _buildBody(state),
          ),
        );
      },
    );
  }

  Widget _buildBody(NotificationsState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.errorMessage != null && state.items.isEmpty) {
      return ListView(
        children: [
          const SizedBox(height: 120),
          const Icon(Icons.error_outline, size: 40),
          const SizedBox(height: 12),
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                state.errorMessage!,
                textAlign: TextAlign.center,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: ElevatedButton(
              onPressed: _provider.loadInitial,
              child: const Text('Retry'),
            ),
          ),
        ],
      );
    }

    if (state.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 140),
          Icon(Icons.notifications_none, size: 42),
          SizedBox(height: 12),
          Center(
            child: Text('No notifications yet.'),
          ),
        ],
      );
    }

    return ListView.builder(
      itemCount: state.items.length + 1,
      itemBuilder: (context, index) {
        if (index == state.items.length) {
          if (state.isFetchingMore) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          if (state.hasNextPage) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: TextButton(
                  onPressed: _provider.fetchNextPage,
                  child: const Text('Load more'),
                ),
              ),
            );
          }
          return const SizedBox(height: 12);
        }

        final item = state.items[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: ListTile(
            title: Text(
              item.title,
              style: TextStyle(
                fontWeight: item.isUnread ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
            subtitle: Text(item.body),
            trailing: TextButton(
              onPressed: () => _provider.setReadState(
                notificationId: item.id,
                read: !item.isRead,
              ),
              child: Text(item.isRead ? 'Mark Unread' : 'Mark Read'),
            ),
          ),
        );
      },
    );
  }
}
