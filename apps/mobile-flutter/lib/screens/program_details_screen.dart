import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/programs/program_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/programs/models/program_models.dart';

class ProgramDetailsScreen extends StatefulWidget {
  const ProgramDetailsScreen({
    super.key,
    required this.programId,
    this.service,
  });

  static const routeName = '/programs/details';

  final String programId;
  final ProgramService? service;

  @override
  State<ProgramDetailsScreen> createState() => _ProgramDetailsScreenState();
}

class _ProgramDetailsScreenState extends State<ProgramDetailsScreen> {
  late final ProgramService _service;

  bool _loading = true;
  bool _enrolled = false;
  String? _error;
  ProgramItem? _program;
  ProgramProgressItem? _progress;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ProgramService();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final details = await _service.getProgramDetails(widget.programId);
      ProgramProgressItem? progress;
      try {
        final loadedProgress = await _service.getProgress(details.data.id);
        progress = loadedProgress;
        if (loadedProgress.completionPct > 0 || loadedProgress.currentModule != null) {
          _enrolled = true;
        }
      } catch (_) {
        progress = null;
      }

      if (!mounted) return;
      setState(() {
        _program = details.data;
        _progress = progress;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load program.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleEnrollment() async {
    final program = _program;
    if (program == null) return;
    setState(() => _error = null);
    try {
      if (_enrolled) {
        await _service.cancelEnrollment(program.id);
        if (mounted) {
          setState(() {
            _enrolled = false;
            _progress = null;
          });
        }
      } else {
        await _service.enroll(program.id);
        if (mounted) {
          setState(() {
            _enrolled = true;
            _progress = ProgramProgressItem(
              programId: program.id,
              completionPct: 0,
            );
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to update enrollment.');
    }
  }

  Future<void> _updateProgress(double value) async {
    final program = _program;
    if (program == null || !_enrolled) return;
    try {
      final progress = await _service.updateProgress(
        program.id,
        completionPct: value,
        currentModule: _progress?.currentModule,
      );
      if (mounted) setState(() => _progress = progress);
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to update progress.');
    }
  }

  Future<void> _share() async {
    final program = _program;
    if (program == null) return;
    await Clipboard.setData(
      ClipboardData(
        text: '${program.title}\n${program.dateLabel}\n${program.instructorLabel}\n${program.capacityLabel}',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Program details copied to clipboard.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final program = _program;
    final progress = _progress;

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: program?.title ?? 'Program'),
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
            : _error != null && program == null
                ? Center(child: Text(_error!))
                : program == null
                    ? const Center(child: Text('Program not found.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            AspectRatio(
                              aspectRatio: 16 / 9,
                              child: program.bannerImageUrl == null
                                  ? const ColoredBox(
                                      color: AppColors.dividerGrey,
                                      child: Icon(Icons.school_outlined, size: 48),
                                    )
                                  : Image.network(program.bannerImageUrl!, fit: BoxFit.cover),
                            ),
                            const SizedBox(height: 16),
                            Text(program.title, style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 8),
                            Text('${program.dateLabel} • ${program.category}'),
                            Text(program.instructorLabel),
                            Text(program.capacityLabel),
                            if (program.description != null) ...[
                              const SizedBox(height: 16),
                              Text(program.description!),
                            ],
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                            ],
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: _toggleEnrollment,
                              child: Text(_enrolled ? 'Cancel enrollment' : 'Enroll now'),
                            ),
                            if (_enrolled && progress != null) ...[
                              const SizedBox(height: 24),
                              Text('Your progress', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 8),
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
                            ],
                          ],
                        ),
                      ),
      ),
    );
  }
}
