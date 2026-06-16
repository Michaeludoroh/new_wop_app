import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/events/event_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/events/models/event_models.dart';

class EventDetailsScreen extends StatefulWidget {
  const EventDetailsScreen({
    super.key,
    required this.eventId,
    this.service,
  });

  static const routeName = '/events/details';

  final String eventId;
  final EventService? service;

  @override
  State<EventDetailsScreen> createState() => _EventDetailsScreenState();
}

class _EventDetailsScreenState extends State<EventDetailsScreen> {
  late final EventService _service;

  bool _loading = true;
  bool _rsvped = false;
  String? _error;
  EventItem? _event;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? EventService();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final details = await _service.getEventDetails(widget.eventId);
      if (!mounted) return;
      setState(() => _event = details.data);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load event.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleRsvp() async {
    final event = _event;
    if (event == null) return;
    setState(() => _error = null);
    try {
      if (_rsvped) {
        await _service.cancelRsvp(event.id);
        if (mounted) setState(() => _rsvped = false);
      } else {
        await _service.rsvp(event.id);
        if (mounted) setState(() => _rsvped = true);
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to update RSVP.');
    }
  }

  Future<void> _share() async {
    final event = _event;
    if (event == null) return;
    await Clipboard.setData(
      ClipboardData(
        text: '${event.title}\n${event.dateLabel}\n${event.locationLabel}',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Event details copied to clipboard.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final event = _event;

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: event?.title ?? 'Event'),
        actions: [
          IconButton(
            tooltip: 'Share',
            onPressed: _share,
            icon: const Icon(Icons.share_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null && event == null
                ? Center(child: Text(_error!))
                : event == null
                    ? const Center(child: Text('Event not found.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: event.bannerImageUrl == null
                                  ? const ColoredBox(
                                      color: AppColors.dividerGrey,
                                      child: Icon(Icons.event_outlined, size: 48),
                                    )
                                  : Image.network(event.bannerImageUrl!, fit: BoxFit.cover),
                            ),
                            const SizedBox(height: 16),
                            Text(event.title, style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 8),
                            Text(event.category),
                            const SizedBox(height: 8),
                            Text(event.dateLabel),
                            const SizedBox(height: 8),
                            Text(event.locationLabel),
                            if (event.meetingLink != null && event.meetingLink!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(event.meetingLink!),
                            ],
                            const SizedBox(height: 8),
                            Text(
                              event.maxCapacity == null
                                  ? '${event.attendeeCount} attending'
                                  : '${event.attendeeCount} / ${event.maxCapacity} attending',
                            ),
                            if (event.description != null && event.description!.isNotEmpty) ...[
                              const SizedBox(height: 16),
                              Text(event.description!),
                            ],
                            if (_error != null) ...[
                              const SizedBox(height: 16),
                              Card(
                                color: Theme.of(context).colorScheme.errorContainer,
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Text(_error!),
                                ),
                              ),
                            ],
                            const SizedBox(height: 24),
                            if (event.registrationRequired)
                              FilledButton.icon(
                                onPressed: _toggleRsvp,
                                icon: Icon(_rsvped ? Icons.event_busy : Icons.event_available),
                                label: Text(_rsvped ? 'Cancel RSVP' : 'RSVP'),
                              )
                            else
                              const Text('Registration is not required for this event.'),
                          ],
                        ),
                      ),
      ),
    );
  }
}
