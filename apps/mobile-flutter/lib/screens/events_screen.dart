import 'package:flutter/material.dart';

import '../core/events/event_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/events/models/event_models.dart';
import 'event_details_screen.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key, this.service});

  static const routeName = '/events';

  final EventService? service;

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  late final EventService _service;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  EventListResponse? _events;
  EventListResponse? _featured;
  String _category = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? EventService();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getEvents(
          search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
          category: _category.isEmpty ? null : _category,
          limit: 50,
        ),
        _service.getFeaturedEvents(limit: 8),
      ]);
      if (!mounted) return;
      setState(() {
        _events = results[0];
        _featured = results[1];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load events.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetails(EventItem event) {
    Navigator.of(context).pushNamed(EventDetailsScreen.routeName, arguments: event.slug.isEmpty ? event.id : event.slug);
  }

  @override
  Widget build(BuildContext context) {
    final events = _events?.data ?? const <EventItem>[];
    final featured = _featured?.data ?? const <EventItem>[];

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'Events')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search events, venue, description',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.search),
                          onPressed: _load,
                        ),
                      ),
                      onSubmitted: (_) => _load(),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _category.isEmpty ? null : _category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: const [
                        DropdownMenuItem(value: 'GENERAL', child: Text('General')),
                        DropdownMenuItem(value: 'SERVICE', child: Text('Service')),
                        DropdownMenuItem(value: 'CONFERENCE', child: Text('Conference')),
                        DropdownMenuItem(value: 'PRAYER', child: Text('Prayer')),
                        DropdownMenuItem(value: 'YOUTH', child: Text('Youth')),
                      ],
                      onChanged: (value) {
                        setState(() => _category = value ?? '');
                        _load();
                      },
                    ),
                    const SizedBox(height: 16),
                    if (_error != null)
                      Card(
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(_error!),
                        ),
                      ),
                    if (featured.isNotEmpty) ...[
                      const _SectionHeader(title: 'Featured Events'),
                      SizedBox(
                        height: 210,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: featured.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) => SizedBox(
                            width: 280,
                            child: _EventCard(
                              event: featured[index],
                              onTap: () => _openDetails(featured[index]),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const _SectionHeader(title: 'Upcoming Events'),
                    if (events.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text('No upcoming events found.'),
                      )
                    else
                      ...events.map((event) => _EventCard(
                            event: event,
                            onTap: () => _openDetails(event),
                          )),
                  ],
                ),
              ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(title, style: Theme.of(context).textTheme.titleMedium),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.onTap,
  });

  final EventItem event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: event.bannerImageUrl == null
                  ? const ColoredBox(
                      color: AppColors.dividerGrey,
                      child: Icon(Icons.event_outlined, size: 40),
                    )
                  : Image.network(event.bannerImageUrl!, fit: BoxFit.cover),
            ),
            ListTile(
              title: Text(event.title, maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                '${event.dateLabel} • ${event.locationLabel}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: event.featured ? const Icon(Icons.star) : null,
            ),
          ],
        ),
      ),
    );
  }
}
