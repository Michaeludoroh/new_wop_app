import 'package:flutter/material.dart';

import '../core/mentorship/mentorship_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/mentorship/models/mentorship_models.dart';
import 'mentorship_details_screen.dart';

class MentorshipScreen extends StatefulWidget {
  const MentorshipScreen({super.key, this.service});

  static const routeName = '/mentorship';

  final MentorshipService? service;

  @override
  State<MentorshipScreen> createState() => _MentorshipScreenState();
}

class _MentorshipScreenState extends State<MentorshipScreen> {
  late final MentorshipService _service;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  MentorshipListResponse? _classes;
  MentorshipListResponse? _featured;
  String _category = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? MentorshipService();
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
        _service.getClasses(
          search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
          category: _category.isEmpty ? null : _category,
          limit: 50,
        ),
        _service.getFeaturedClasses(limit: 8),
      ]);
      if (!mounted) return;
      setState(() {
        _classes = results[0];
        _featured = results[1];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load mentorship classes.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetails(MentorshipItem item) {
    Navigator.of(context).pushNamed(
      MentorshipDetailsScreen.routeName,
      arguments: item.slug.isEmpty ? item.id : item.slug,
    );
  }

  @override
  Widget build(BuildContext context) {
    final classes = _classes?.data ?? const <MentorshipItem>[];
    final featured = _featured?.data ?? const <MentorshipItem>[];

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'Mentorship')),
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
                        hintText: 'Search classes, mentors, description',
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
                        DropdownMenuItem(value: 'LEADERSHIP', child: Text('Leadership')),
                        DropdownMenuItem(value: 'CAREER', child: Text('Career')),
                        DropdownMenuItem(value: 'DISCIPLESHIP', child: Text('Discipleship')),
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
                      const _SectionHeader(title: 'Featured Mentorship'),
                      SizedBox(
                        height: 210,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: featured.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) => SizedBox(
                            width: 280,
                            child: _MentorshipCard(
                              item: featured[index],
                              onTap: () => _openDetails(featured[index]),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const _SectionHeader(title: 'All Classes'),
                    if (classes.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text('No mentorship classes found.'),
                      )
                    else
                      ...classes.map(
                        (item) => _MentorshipCard(
                          item: item,
                          onTap: () => _openDetails(item),
                        ),
                      ),
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

class _MentorshipCard extends StatelessWidget {
  const _MentorshipCard({required this.item, required this.onTap});

  final MentorshipItem item;
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
              child: item.bannerImageUrl == null
                  ? const ColoredBox(
                      color: AppColors.dividerGrey,
                      child: Icon(Icons.groups_outlined, size: 40),
                    )
                  : Image.network(item.bannerImageUrl!, fit: BoxFit.cover),
            ),
            ListTile(
              title: Text(item.title, maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                '${item.dateLabel} • ${item.mentorLabel}\n${item.capacityLabel}',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: item.featured ? const Icon(Icons.star) : null,
            ),
          ],
        ),
      ),
    );
  }
}
