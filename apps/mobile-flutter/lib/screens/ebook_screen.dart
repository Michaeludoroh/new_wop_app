import 'package:flutter/material.dart';

import '../core/ebooks/ebook_service.dart';
import '../core/ebooks/models/ebook_models.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'ebook_details_screen.dart';
import 'pdf_reader_screen.dart';

class EbookScreen extends StatefulWidget {
  const EbookScreen({super.key, this.service});

  static const routeName = '/ebooks';

  final EbookService? service;

  @override
  State<EbookScreen> createState() => _EbookScreenState();
}

class _EbookScreenState extends State<EbookScreen> {
  late final EbookService _service = widget.service ?? EbookService();
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  EbookListResponse? _response;
  List<ReadingProgressItem> _recentlyRead = const [];
  String _category = '';

  @override
  void initState() {
    super.initState();
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
        _service.getEbooks(
          search: _searchController.text.trim().isEmpty
              ? null
              : _searchController.text.trim(),
          category: _category.isEmpty ? null : _category,
        ),
        _service.getRecentlyRead(limit: 5),
      ]);
      if (!mounted) return;
      setState(() {
        _response = results[0] as EbookListResponse;
        _recentlyRead = (results[1] as RecentlyReadResponse).data;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load eBooks.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openDetails(EbookItem ebook) {
    Navigator.of(context).pushNamed(
      EbookDetailsScreen.routeName,
      arguments: ebook.id,
    );
  }

  Future<void> _resumeReading(ReadingProgressItem item) async {
    final access = await _service.getAccess(item.ebookId);
    if (!mounted) return;
    if (!access.authorized || access.contentUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to resume this eBook.')),
      );
      return;
    }

    await Navigator.of(context).pushNamed(
      PdfReaderScreen.routeName,
      arguments: PdfReaderArgs(
        ebookId: item.ebookId,
        fileUrl: access.contentUrl,
        title: item.ebook?.title ?? 'eBook',
        initialPage: item.currentPage,
        totalPages: item.totalPages,
        bookmarkPages: item.bookmarkPages ?? const [],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = _response;

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'eBooks')),
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
                        hintText: 'Search by title, author, description',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.search),
                          onPressed: _load,
                        ),
                      ),
                      onSubmitted: (_) => _load(),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _category.isEmpty ? null : _category,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Faith', child: Text('Faith')),
                        DropdownMenuItem(
                            value: 'Leadership', child: Text('Leadership')),
                        DropdownMenuItem(
                            value: 'Prayer', child: Text('Prayer')),
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
                    if (_recentlyRead.isNotEmpty) ...[
                      _SectionHeader(title: 'Recently Read'),
                      ..._recentlyRead.map(
                        (item) => Card(
                          child: ListTile(
                            leading: const Icon(Icons.history),
                            title: Text(item.ebook?.title ?? 'eBook'),
                            subtitle: Text(
                              item.completed
                                  ? 'Completed'
                                  : 'Resume page ${item.currentPage}',
                            ),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => _resumeReading(item),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    if (data != null) ...[
                      _SectionHeader(title: 'Featured'),
                      if (data.featured.isEmpty)
                        const _EmptySection(message: 'No featured eBooks yet.')
                      else
                        ...data.featured.map((e) => _EbookTile(
                              ebook: e,
                              onTap: () => _openDetails(e),
                            )),
                      const SizedBox(height: 12),
                      _SectionHeader(title: 'Recently Added'),
                      if (data.recent.isEmpty)
                        const _EmptySection(message: 'No recent eBooks yet.')
                      else
                        ...data.recent.map((e) => _EbookTile(
                              ebook: e,
                              onTap: () => _openDetails(e),
                            )),
                      const SizedBox(height: 12),
                      _SectionHeader(title: 'All eBooks'),
                      if (data.data.isEmpty)
                        const _EmptySection(message: 'No eBooks match your filters.')
                      else
                        ...data.data.map((e) => _EbookTile(
                              ebook: e,
                              onTap: () => _openDetails(e),
                            )),
                    ],
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

class _EmptySection extends StatelessWidget {
  const _EmptySection({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(message, style: Theme.of(context).textTheme.bodyMedium),
    );
  }
}

class _EbookTile extends StatelessWidget {
  const _EbookTile({
    required this.ebook,
    required this.onTap,
  });

  final EbookItem ebook;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = '${ebook.author} • ${ebook.category}';
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: ebook.coverImage.isNotEmpty
            ? ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  ebook.coverImage,
                  width: 44,
                  height: 56,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.menu_book_outlined),
                ),
              )
            : const Icon(Icons.menu_book_outlined),
        title: Text(ebook.title),
        subtitle: Text(subtitle),
        trailing: Text(
          ebook.isPremium ? '\$${ebook.price.toStringAsFixed(2)}' : 'Free',
        ),
      ),
    );
  }
}
