import 'package:flutter/material.dart';

import '../core/clips/clip_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/clips/models/clip_models.dart';
import '../core/logging/app_log.dart';
import 'clip_details_screen.dart';

class ClipsScreen extends StatefulWidget {
  const ClipsScreen({super.key, this.service, this.embedded = false});

  static const routeName = '/clips';

  final ClipService? service;

  /// When true, omit the local AppBar so this screen can sit in a parent tab.
  final bool embedded;

  @override
  State<ClipsScreen> createState() => _ClipsScreenState();
}

class _ClipsScreenState extends State<ClipsScreen> {
  late final ClipService _service;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  ClipListResponse? _clips;
  ClipListResponse? _featured;
  String _category = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ClipService();
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

    ClipListResponse? clips;
    ClipListResponse? featured;
    String? error;

    try {
      clips = await _service.getClips(
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        category: _category.isEmpty ? null : _category,
        limit: 50,
      );
    } catch (errorObject) {
      AppLog.debug('Clips list failed: $errorObject');
      error = errorObject.toString();
    }

    try {
      featured = await _service.getFeaturedClips(limit: 8);
    } catch (errorObject) {
      AppLog.debug('Featured clips failed: $errorObject');
      featured = const ClipListResponse(data: [], total: 0, limit: 8, offset: 0);
    }

    if (!mounted) return;
    setState(() {
      _clips = clips;
      _featured = featured;
      _error = error;
      _loading = false;
    });
  }

  void _openDetails(ClipItem clip) {
    Navigator.of(context).pushNamed(ClipDetailsScreen.routeName, arguments: clip.id);
  }

  @override
  Widget build(BuildContext context) {
    final clips = _clips?.data ?? const <ClipItem>[];
    final featured = _featured?.data ?? const <ClipItem>[];

    final body = _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search clips, speakers, tags',
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
                        DropdownMenuItem(value: 'TEACHING', child: Text('Teaching')),
                        DropdownMenuItem(value: 'PRAYER', child: Text('Prayer')),
                        DropdownMenuItem(value: 'TESTIMONY', child: Text('Testimony')),
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
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_error!),
                              TextButton(
                                onPressed: _load,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (featured.isNotEmpty) ...[
                      const _SectionHeader(title: 'Featured Clips'),
                      SizedBox(
                        height: 240,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: featured.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) => SizedBox(
                            width: 260,
                            child: _ClipCard(
                              clip: featured[index],
                              onTap: () => _openDetails(featured[index]),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const _SectionHeader(title: 'Latest Clips'),
                    if (clips.isEmpty && _error == null)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text('No clips found.'),
                      )
                    else if (clips.isEmpty && _error != null)
                      const SizedBox.shrink()
                    else
                      ...clips.map((clip) => _ClipCard(
                            clip: clip,
                            onTap: () => _openDetails(clip),
                          )),
                  ],
                ),
              );

    if (widget.embedded) {
      return body;
    }

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'Clips')),
      body: SafeArea(child: body),
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

class _ClipCard extends StatelessWidget {
  const _ClipCard({
    required this.clip,
    required this.onTap,
  });

  final ClipItem clip;
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
              child: clip.hasThumbnail
                  ? Image.network(
                      clip.thumbnailUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const ColoredBox(
                        color: AppColors.dividerGrey,
                        child: Icon(Icons.play_circle_outline, size: 40),
                      ),
                    )
                  : const ColoredBox(
                      color: AppColors.dividerGrey,
                      child: Icon(Icons.play_circle_outline, size: 40),
                    ),
            ),
            ListTile(
              title: Text(clip.title, maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                [clip.speaker, clip.category, clip.durationLabel]
                    .where((item) => item != null && item.toString().isNotEmpty)
                    .join(' • '),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
