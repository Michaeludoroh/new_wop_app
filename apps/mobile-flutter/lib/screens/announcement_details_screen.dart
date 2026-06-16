import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/announcements/announcement_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/announcements/models/announcement_models.dart';

class AnnouncementDetailsScreen extends StatefulWidget {
  const AnnouncementDetailsScreen({
    super.key,
    required this.announcementId,
    this.service,
  });

  static const routeName = '/announcements/details';

  final String announcementId;
  final AnnouncementService? service;

  @override
  State<AnnouncementDetailsScreen> createState() => _AnnouncementDetailsScreenState();
}

class _AnnouncementDetailsScreenState extends State<AnnouncementDetailsScreen> {
  late final AnnouncementService _service;

  bool _loading = true;
  String? _error;
  AnnouncementItem? _announcement;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? AnnouncementService();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final details = await _service.getAnnouncementDetails(widget.announcementId);
      if (!mounted) return;
      setState(() => _announcement = details.data);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load announcement.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _share() async {
    final announcement = _announcement;
    if (announcement == null) return;
    await Clipboard.setData(
      ClipboardData(
        text: '${announcement.title}\n\n${announcement.content}',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Announcement copied to clipboard.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final announcement = _announcement;

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'Announcement'),
        actions: [
          IconButton(
            onPressed: announcement == null ? null : _share,
            icon: const Icon(Icons.share_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!),
                          const SizedBox(height: 12),
                          FilledButton(onPressed: _load, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : announcement == null
                    ? const Center(child: Text('Announcement not found.'))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                Chip(label: Text(announcement.categoryLabel)),
                                Chip(label: Text(announcement.status)),
                              ],
                            ),
                            if (announcement.imageUrl != null &&
                                announcement.imageUrl!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 16, bottom: 16),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    announcement.imageUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      height: 200,
                                      color: AppColors.imagePlaceholder,
                                      alignment: Alignment.center,
                                      child: const Icon(Icons.broken_image_outlined),
                                    ),
                                  ),
                                ),
                              ),
                            Text(
                              announcement.title,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              announcement.dateLabel,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              announcement.content,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          ],
                        ),
                      ),
      ),
    );
  }
}
