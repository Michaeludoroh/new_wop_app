import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/mentorship/mentorship_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/mentorship/models/mentorship_models.dart';

class MentorshipDetailsScreen extends StatefulWidget {
  const MentorshipDetailsScreen({
    super.key,
    required this.classId,
    this.service,
  });

  static const routeName = '/mentorship/details';

  final String classId;
  final MentorshipService? service;

  @override
  State<MentorshipDetailsScreen> createState() => _MentorshipDetailsScreenState();
}

class _MentorshipDetailsScreenState extends State<MentorshipDetailsScreen> {
  late final MentorshipService _service;

  bool _loading = true;
  String? _error;
  String? _enrollmentStatus;
  MentorshipItem? _item;
  List<MentorshipSessionItem> _sessions = const [];
  List<MentorshipAttendanceItem> _attendance = const [];
  MentorshipProgressItem? _progress;
  int _feedbackRating = 5;
  final TextEditingController _feedbackController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? MentorshipService();
    _load();
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final details = await _service.getClassDetails(widget.classId);
      final sessions = await _service.getSessions(widget.classId);
      MentorshipProgressItem? progress;
      List<MentorshipAttendanceItem> attendance = const [];
      String? enrollmentStatus;

      try {
        progress = await _service.getProgress(details.data.id);
        attendance = await _service.getAttendance(details.data.id);
        if (progress.completionPct > 0 || progress.currentMilestone != null) {
          enrollmentStatus = 'ENROLLED';
        }
      } catch (_) {
        progress = null;
      }

      if (!mounted) return;
      setState(() {
        _item = details.data;
        _sessions = sessions;
        _progress = progress;
        _attendance = attendance;
        _enrollmentStatus = enrollmentStatus;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load mentorship class.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleEnrollment() async {
    final item = _item;
    if (item == null) return;
    setState(() => _error = null);
    try {
      if (_enrollmentStatus == 'ENROLLED' || _enrollmentStatus == 'WAITLISTED') {
        await _service.cancelEnrollment(item.id);
        if (mounted) {
          setState(() {
            _enrollmentStatus = null;
            _progress = null;
            _attendance = const [];
          });
        }
      } else {
        final result = await _service.enroll(item.id);
        if (mounted) {
          setState(() {
            _enrollmentStatus = result.status;
            if (result.status == 'ENROLLED') {
              _progress = MentorshipProgressItem(
                mentorshipClassId: item.id,
                completionPct: 0,
              );
            }
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to update enrollment.');
    }
  }

  Future<void> _updateProgress(double value) async {
    final item = _item;
    if (item == null || _enrollmentStatus != 'ENROLLED') return;
    try {
      final progress = await _service.updateProgress(item.id, completionPct: value);
      if (mounted) setState(() => _progress = progress);
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to update progress.');
    }
  }

  Future<void> _submitFeedback() async {
    final item = _item;
    if (item == null || _enrollmentStatus != 'ENROLLED') return;
    try {
      await _service.submitFeedback(
        item.id,
        rating: _feedbackRating,
        comment: _feedbackController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Feedback submitted.')),
      );
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to submit feedback.');
    }
  }

  Future<void> _share() async {
    final item = _item;
    if (item == null) return;
    await Clipboard.setData(
      ClipboardData(
        text: '${item.title}\nMentor: ${item.mentorLabel}\n${item.dateLabel}\n${item.capacityLabel}',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Mentorship details copied to clipboard.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = _item;
    final progress = _progress;

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: item?.title ?? 'Mentorship'),
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
            : _error != null && item == null
                ? Center(child: Text(_error!))
                : item == null
                    ? const Center(child: Text('Mentorship class not found.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: item.bannerImageUrl == null
                                  ? const ColoredBox(
                                      color: AppColors.dividerGrey,
                                      child: Icon(Icons.groups_outlined, size: 48),
                                    )
                                  : Image.network(item.bannerImageUrl!, fit: BoxFit.cover),
                            ),
                            const SizedBox(height: 16),
                            Text(item.title, style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 8),
                            Text('${item.dateLabel} • ${item.category}'),
                            Text(item.capacityLabel),
                            if (item.description != null) ...[
                              const SizedBox(height: 16),
                              Text(item.description!),
                            ],
                            const SizedBox(height: 16),
                            Card(
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundImage: item.mentor.imageUrl != null
                                      ? NetworkImage(item.mentor.imageUrl!)
                                      : null,
                                  child: item.mentor.imageUrl == null
                                      ? const Icon(Icons.person_outline)
                                      : null,
                                ),
                                title: Text(item.mentorLabel),
                                subtitle: Text(item.mentor.bio ?? item.mentorBio ?? 'Mentor profile'),
                              ),
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                            ],
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: _toggleEnrollment,
                              child: Text(
                                _enrollmentStatus == 'ENROLLED'
                                    ? 'Cancel enrollment'
                                    : _enrollmentStatus == 'WAITLISTED'
                                        ? 'Leave waitlist'
                                        : 'Enroll now',
                              ),
                            ),
                            if (_enrollmentStatus == 'WAITLISTED')
                              const Padding(
                                padding: EdgeInsets.only(top: 8),
                                child: Text('You are on the waitlist for this class.'),
                              ),
                            const SizedBox(height: 24),
                            Text('Session schedule', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 8),
                            if (_sessions.isEmpty)
                              const Text('No sessions scheduled yet.')
                            else
                              ..._sessions.map(
                                (session) => ListTile(
                                  leading: const Icon(Icons.event_note_outlined),
                                  title: Text(session.title),
                                  subtitle: Text(
                                    '${session.scheduleLabel} • ${session.durationMinutes} min\n${session.location ?? session.meetingLink ?? 'TBD'}',
                                  ),
                                ),
                              ),
                            if (_enrollmentStatus == 'ENROLLED' && _attendance.isNotEmpty) ...[
                              const SizedBox(height: 24),
                              Text('Attendance history', style: Theme.of(context).textTheme.titleMedium),
                              ..._attendance.map(
                                (record) => ListTile(
                                  leading: Icon(
                                    record.status == 'PRESENT'
                                        ? Icons.check_circle_outline
                                        : Icons.cancel_outlined,
                                  ),
                                  title: Text(record.session.title),
                                  subtitle: Text('${record.status} • ${record.session.scheduleLabel}'),
                                ),
                              ),
                            ],
                            if (_enrollmentStatus == 'ENROLLED' && progress != null) ...[
                              const SizedBox(height: 24),
                              Text('Your progress', style: Theme.of(context).textTheme.titleMedium),
                              LinearProgressIndicator(value: progress.completionPct / 100),
                              Text('${progress.completionPct.toStringAsFixed(0)}% complete'),
                              Slider(
                                value: progress.completionPct.clamp(0, 100),
                                min: 0,
                                max: 100,
                                divisions: 20,
                                label: '${progress.completionPct.round()}%',
                                onChanged: _updateProgress,
                              ),
                              const SizedBox(height: 24),
                              Text('Submit feedback', style: Theme.of(context).textTheme.titleMedium),
                              Row(
                                children: List.generate(5, (index) {
                                  final rating = index + 1;
                                  return IconButton(
                                    onPressed: () => setState(() => _feedbackRating = rating),
                                    icon: Icon(
                                      rating <= _feedbackRating ? Icons.star : Icons.star_border,
                                    ),
                                  );
                                }),
                              ),
                              TextField(
                                controller: _feedbackController,
                                decoration: const InputDecoration(
                                  hintText: 'Share your feedback (optional)',
                                ),
                                maxLines: 3,
                              ),
                              const SizedBox(height: 8),
                              OutlinedButton(
                                onPressed: _submitFeedback,
                                child: const Text('Submit feedback'),
                              ),
                            ],
                          ],
                        ),
                      ),
      ),
    );
  }
}
