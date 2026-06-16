import 'package:flutter/material.dart';

import '../core/ebooks/ebook_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../core/ebooks/models/ebook_models.dart';
import 'ebook_details_screen.dart';
import 'ebook_screen.dart';
import 'pdf_reader_screen.dart';

class MyLibraryScreen extends StatefulWidget {
  const MyLibraryScreen({super.key, this.service});

  static const routeName = '/library';

  final EbookService? service;

  @override
  State<MyLibraryScreen> createState() => _MyLibraryScreenState();
}

class _MyLibraryScreenState extends State<MyLibraryScreen> {
  late final EbookService _service = widget.service ?? EbookService();

  bool _loading = true;
  String? _error;
  LibraryResponse? _library;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.getMyLibrary();
      if (!mounted) return;
      setState(() => _library = data);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load your library.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _continueReading(ReadingProgressItem item) async {
    final access = await _service.getAccess(item.ebookId);
    if (!mounted) return;
    if (!access.authorized || access.contentUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Subscribe or purchase this eBook to gain access.'),
        ),
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
    await _load();
  }

  void _openDetails(EbookItem ebook) {
    Navigator.of(context).pushNamed(
      EbookDetailsScreen.routeName,
      arguments: ebook.id,
    );
  }

  void _openCatalog() {
    Navigator.of(context).pushNamed(EbookScreen.routeName);
  }

  @override
  Widget build(BuildContext context) {
    final library = _library;
    final isEmpty = library != null &&
        library.purchased.isEmpty &&
        library.subscription.isEmpty &&
        library.continueReading.isEmpty &&
        library.downloads.isEmpty &&
        library.history.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const MinistryAppBarTitle(title: 'My Library'),
        actions: [
          TextButton(
            onPressed: _openCatalog,
            child: const Text('Browse eBooks'),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (_error != null)
                      Card(
                        color: Theme.of(context).colorScheme.errorContainer,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(_error!),
                        ),
                      ),
                    if (isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                'Your library is empty. Purchase an eBook or browse free titles to get started.',
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: _openCatalog,
                                child: const Text('Browse eBook Catalog'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    if (library != null) ...[
                      _Header('Recently Read'),
                      if (library.recentlyRead.isEmpty)
                        const _EmptyLine('No recent reading activity yet.')
                      else
                        ...library.recentlyRead.map((p) => _ProgressTile(
                              item: p,
                              onTap: () => _continueReading(p),
                            )),
                      _Header('Continue Reading'),
                      if (library.continueReading.isEmpty)
                        const _EmptyLine('Nothing in progress right now.')
                      else
                        ...library.continueReading.map((p) => _ProgressTile(
                              item: p,
                              onTap: () => _continueReading(p),
                            )),
                      _Header('Purchased eBooks'),
                      if (library.purchased.isEmpty)
                        const _EmptyLine('No purchased eBooks yet.')
                      else
                        ...library.purchased.map((e) => _EbookTile(
                              title: e.title,
                              subtitle: e.author,
                              onTap: () => _openDetails(e),
                            )),
                      _Header('Subscription eBooks'),
                      if (library.subscription.isEmpty)
                        const _EmptyLine('No subscription titles available.')
                      else
                        ...library.subscription.map((e) => _EbookTile(
                              title: e.title,
                              subtitle: e.author,
                              onTap: () => _openDetails(e),
                            )),
                      _Header('Downloads'),
                      if (library.downloads.isEmpty)
                        const _EmptyLine('No downloaded eBooks yet.')
                      else
                        ...library.downloads.map((p) => _ProgressTile(
                              item: p,
                              subtitle: 'Downloaded',
                              onTap: () => _continueReading(p),
                            )),
                      _Header('Reading History'),
                      if (library.history.isEmpty)
                        const _EmptyLine('No reading history yet.')
                      else
                        ...library.history.map((p) => _ProgressTile(
                              item: p,
                              subtitle: p.completed
                                  ? 'Completed'
                                  : 'Last page ${p.currentPage}',
                              onTap: () => _continueReading(p),
                            )),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 8),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium),
    );
  }
}

class _EmptyLine extends StatelessWidget {
  const _EmptyLine(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text),
    );
  }
}

class _EbookTile extends StatelessWidget {
  const _EbookTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _ProgressTile extends StatelessWidget {
  const _ProgressTile({
    required this.item,
    required this.onTap,
    this.subtitle,
  });

  final ReadingProgressItem item;
  final VoidCallback onTap;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final progressLabel = subtitle ??
        (item.completed
            ? 'Completed'
            : 'Page ${item.currentPage}${item.totalPages != null ? ' / ${item.totalPages}' : ''}');
    return Card(
      child: ListTile(
        title: Text(item.ebook?.title ?? 'Unknown'),
        subtitle: Text(progressLabel),
        trailing: item.completed
            ? const Icon(Icons.check_circle, color: AppColors.success)
            : const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
