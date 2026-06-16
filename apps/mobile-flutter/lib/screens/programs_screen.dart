import 'package:flutter/material.dart';

import '../core/programs/program_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/programs/models/program_models.dart';
import 'program_details_screen.dart';

class ProgramsScreen extends StatefulWidget {
  const ProgramsScreen({super.key, this.service});

  static const routeName = '/programs';

  final ProgramService? service;

  @override
  State<ProgramsScreen> createState() => _ProgramsScreenState();
}

class _ProgramsScreenState extends State<ProgramsScreen> {
  late final ProgramService _service;
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  ProgramListResponse? _programs;
  ProgramListResponse? _featured;
  String _category = '';

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ProgramService();
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
        _service.getPrograms(
          search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
          category: _category.isEmpty ? null : _category,
          limit: 50,
        ),
        _service.getFeaturedPrograms(limit: 8),
      ]);
      if (!mounted) return;
      setState(() {
        _programs = results[0];
        _featured = results[1];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load programs.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetails(ProgramItem program) {
    Navigator.of(context).pushNamed(
      ProgramDetailsScreen.routeName,
      arguments: program.slug.isEmpty ? program.id : program.slug,
    );
  }

  @override
  Widget build(BuildContext context) {
    final programs = _programs?.data ?? const <ProgramItem>[];
    final featured = _featured?.data ?? const <ProgramItem>[];

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'Programs')),
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
                        hintText: 'Search programs, instructor, description',
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
                        DropdownMenuItem(value: 'DISCIPLESHIP', child: Text('Discipleship')),
                        DropdownMenuItem(value: 'CAREER', child: Text('Career')),
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
                      const _SectionHeader(title: 'Featured Programs'),
                      SizedBox(
                        height: 210,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: featured.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 12),
                          itemBuilder: (context, index) => SizedBox(
                            width: 280,
                            child: _ProgramCard(
                              program: featured[index],
                              onTap: () => _openDetails(featured[index]),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const _SectionHeader(title: 'All Programs'),
                    if (programs.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Text('No programs found.'),
                      )
                    else
                      ...programs.map(
                        (program) => _ProgramCard(
                          program: program,
                          onTap: () => _openDetails(program),
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

class _ProgramCard extends StatelessWidget {
  const _ProgramCard({
    required this.program,
    required this.onTap,
  });

  final ProgramItem program;
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
              child: program.bannerImageUrl == null
                  ? const ColoredBox(
                      color: AppColors.dividerGrey,
                      child: Icon(Icons.school_outlined, size: 40),
                    )
                  : Image.network(program.bannerImageUrl!, fit: BoxFit.cover),
            ),
            ListTile(
              title: Text(program.title, maxLines: 2, overflow: TextOverflow.ellipsis),
              subtitle: Text(
                '${program.dateLabel} • ${program.instructorLabel}\n${program.capacityLabel}',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: program.featured ? const Icon(Icons.star) : null,
            ),
          ],
        ),
      ),
    );
  }
}
