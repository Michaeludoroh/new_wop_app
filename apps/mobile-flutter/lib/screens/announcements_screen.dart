import 'package:flutter/material.dart';

import '../core/announcements/announcement_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/announcements/models/announcement_models.dart';
import 'announcement_details_screen.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key, this.service, this.showAppBar = true});

  static const routeName = '/announcements';

  final AnnouncementService? service;
  final bool showAppBar;

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  late final AnnouncementService _service;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  AnnouncementListResponse? _announcements;
  List<AnnouncementCategoryOption> _categories = const [];
  String _category = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? AnnouncementService();
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
        _service.getAnnouncements(
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
          category: _category.isEmpty ? null : _category,
          limit: 50,
        ),
        _service.getCategories(),
      ]);
      if (!mounted) return;
      setState(() {
        _announcements = results[0] as AnnouncementListResponse;
        _categories = results[1] as List<AnnouncementCategoryOption>;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load announcements.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetails(AnnouncementItem announcement) {
    Navigator.of(context).pushNamed(
      AnnouncementDetailsScreen.routeName,
      arguments: announcement.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    final announcements = _announcements?.data ?? const <AnnouncementItem>[];

    return Scaffold(
      appBar: widget.showAppBar
          ? AppBar(title: const MinistryAppBarTitle(title: 'Announcements'))
          : null,
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
                        hintText: 'Search announcements',
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
                      items: [
                        const DropdownMenuItem<String>(
                          value: '',
                          child: Text('All categories'),
                        ),
                        ..._categories.map(
                          (option) => DropdownMenuItem<String>(
                            value: option.value,
                            child: Text(option.label),
                          ),
                        ),
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
                          padding: const EdgeInsets.all(16),
                          child: Text(_error!),
                        ),
                      ),
                    if (_error == null && announcements.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('No announcements found.')),
                        ),
                      ),
                    ...announcements.map(
                      (announcement) => Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => _openDetails(announcement),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
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
                                    padding: const EdgeInsets.only(top: 12, bottom: 12),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        announcement.imageUrl!,
                                        height: 160,
                                        width: double.infinity,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          height: 160,
                                          color: AppColors.imagePlaceholder,
                                          alignment: Alignment.center,
                                          child: const Icon(Icons.broken_image_outlined),
                                        ),
                                      ),
                                    ),
                                  ),
                                Text(
                                  announcement.title,
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  announcement.content,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  announcement.dateLabel,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
