import 'package:flutter/material.dart';

import 'about_screen.dart';
import 'announcements_screen.dart';
import 'mentorship_screen.dart';
import 'programs_screen.dart';
import 'subscription_screen.dart';

class MoreMenuItem {
  const MoreMenuItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.routeName,
    this.enabled = true,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final String routeName;
  final bool enabled;
}

class MoreMenuSection {
  const MoreMenuSection({
    required this.title,
    required this.items,
  });

  final String title;
  final List<MoreMenuItem> items;
}

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  /// Primary ministry features accessible from More.
  static const List<MoreMenuItem> ministryItems = [
    MoreMenuItem(
      title: 'Announcements',
      subtitle: 'Latest ministry updates and news',
      icon: Icons.campaign_outlined,
      routeName: AnnouncementsScreen.routeName,
    ),
    MoreMenuItem(
      title: 'Programs',
      subtitle: 'Enroll in empowerment programs',
      icon: Icons.school_outlined,
      routeName: ProgramsScreen.routeName,
    ),
    MoreMenuItem(
      title: 'Mentorship',
      subtitle: 'Classes, sessions, and progress',
      icon: Icons.groups_outlined,
      routeName: MentorshipScreen.routeName,
    ),
    MoreMenuItem(
      title: 'Subscription',
      subtitle: 'Manage membership and premium access',
      icon: Icons.workspace_premium_outlined,
      routeName: SubscriptionScreen.routeName,
    ),
  ];

  /// App information and credits.
  static const List<MoreMenuItem> appItems = [
    MoreMenuItem(
      title: 'About WOP',
      subtitle: 'App info, credits, and version',
      icon: Icons.info_outline,
      routeName: AboutScreen.routeName,
    ),
  ];

  /// Add future ministry features here — no bottom-nav redesign required.
  static const List<MoreMenuItem> upcomingItems = [
    // MoreMenuItem(
    //   title: 'Sermons',
    //   subtitle: 'Watch and listen to messages',
    //   icon: Icons.menu_book_outlined,
    //   routeName: '/sermons',
    //   enabled: false,
    // ),
    // MoreMenuItem(
    //   title: 'Donations',
    //   subtitle: 'Give and track contributions',
    //   icon: Icons.volunteer_activism_outlined,
    //   routeName: '/donations',
    //   enabled: false,
    // ),
    // MoreMenuItem(
    //   title: 'Prayer Requests',
    //   subtitle: 'Submit and follow prayer needs',
    //   icon: Icons.favorite_outline,
    //   routeName: '/prayer-requests',
    //   enabled: false,
    // ),
    // MoreMenuItem(
    //   title: 'Live Streaming',
    //   subtitle: 'Join live services and events',
    //   icon: Icons.live_tv_outlined,
    //   routeName: '/live',
    //   enabled: false,
    // ),
    // MoreMenuItem(
    //   title: 'Courses',
    //   subtitle: 'Structured learning paths',
    //   icon: Icons.auto_stories_outlined,
    //   routeName: '/courses',
    //   enabled: false,
    // ),
    // MoreMenuItem(
    //   title: 'Premium Content',
    //   subtitle: 'Exclusive media and resources',
    //   icon: Icons.diamond_outlined,
    //   routeName: '/premium',
    //   enabled: false,
    // ),
  ];

  static const List<MoreMenuSection> sections = [
    MoreMenuSection(title: 'Ministry', items: ministryItems),
    MoreMenuSection(title: 'Coming Soon', items: upcomingItems),
    MoreMenuSection(title: 'App', items: appItems),
  ];

  void _openItem(BuildContext context, MoreMenuItem item) {
    if (!item.enabled) return;
    Navigator.of(context).pushNamed(item.routeName);
  }

  @override
  Widget build(BuildContext context) {
    final visibleSections =
        sections.where((section) => section.items.isNotEmpty).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Text(
          'More',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          'Additional ministry tools and account features',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),
        for (final section in visibleSections) ...[
          _SectionHeader(title: section.title),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var index = 0; index < section.items.length; index++) ...[
                  _MoreMenuTile(
                    item: section.items[index],
                    onTap: () => _openItem(context, section.items[index]),
                  ),
                  if (index < section.items.length - 1)
                    const Divider(height: 1),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

class _MoreMenuTile extends StatelessWidget {
  const _MoreMenuTile({
    required this.item,
    required this.onTap,
  });

  final MoreMenuItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ListTile(
      enabled: item.enabled,
      leading: CircleAvatar(
        backgroundColor: item.enabled
            ? colorScheme.primaryContainer
            : colorScheme.surfaceContainerHighest,
        child: Icon(
          item.icon,
          color: item.enabled
              ? colorScheme.onPrimaryContainer
              : colorScheme.onSurfaceVariant,
        ),
      ),
      title: Text(item.title),
      subtitle: Text(item.subtitle),
      trailing: Icon(
        item.enabled ? Icons.chevron_right : Icons.lock_outline,
        color: colorScheme.onSurfaceVariant,
      ),
      onTap: item.enabled ? onTap : null,
    );
  }
}
