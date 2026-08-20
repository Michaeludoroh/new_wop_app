import 'package:flutter/material.dart';

import '../core/ebooks/ebook_download_store.dart';
import '../core/ebooks/ebook_service.dart';
import '../core/ebooks/models/ebook_models.dart';
import '../core/http/api_error.dart';
import '../core/subscriptions/trial_manager.dart';
import '../widgets/ebooks/ebook_download_button.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/trial_banner.dart';
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
  final EbookDownloadStore _downloadStore = const EbookDownloadStore();
  final TextEditingController _searchController = TextEditingController();

  bool _loading = true;
  String? _error;
  EbookListResponse? _response;
  List<ReadingProgressItem> _recentlyRead = const [];
  String _category = '';
  final Set<String> _purchasedIds = {};
  final Set<String> _downloadedIds = {};
  final Map<String, double> _downloadProgress = {};

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
      final catalog = await _service.getEbooks(
        search: _searchController.text.trim().isEmpty
            ? null
            : _searchController.text.trim(),
        category: _category.isEmpty ? null : _category,
      );
      final recentlyRead = await _service.getRecentlyRead(limit: 5);
      LibraryResponse library;
      try {
        library = await _service.getMyLibrary();
      } catch (_) {
        library = LibraryResponse(
          purchased: const [],
          subscription: const [],
          continueReading: const [],
          downloads: const [],
          history: const [],
          recentlyRead: const [],
        );
      }
      final downloaded = <String>{
        ...library.downloads.map((item) => item.ebookId),
      };
      if (!mounted) return;
      setState(() {
        _response = catalog;
        _recentlyRead = recentlyRead.data;
        _purchasedIds
          ..clear()
          ..addAll(library.purchased.map((item) => item.id));
        _downloadedIds
          ..clear()
          ..addAll(downloaded);
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

  bool get _hasPremiumAccess {
    return TrialManager.hasPremiumAccess(SubscriptionScope.maybeOf(context)?.status);
  }

  bool _isDownloadable(EbookItem ebook) {
    if (!ebook.isPremium || ebook.price <= 0) {
      return true;
    }
    if (_purchasedIds.contains(ebook.id)) {
      return true;
    }
    return _hasPremiumAccess;
  }

  EbookDownloadUiState _downloadState(EbookItem ebook) {
    if (_downloadProgress.containsKey(ebook.id)) {
      return EbookDownloadUiState.downloading;
    }
    if (_downloadedIds.contains(ebook.id)) {
      return EbookDownloadUiState.downloaded;
    }
    if (_isDownloadable(ebook)) {
      return EbookDownloadUiState.available;
    }
    return EbookDownloadUiState.notPurchased;
  }

  Future<void> _handleDownload(EbookItem ebook) async {
    if (!_isDownloadable(ebook)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Purchase to download')),
      );
      _openDetails(ebook);
      return;
    }

    setState(() => _downloadProgress[ebook.id] = 0);
    try {
      await _service.downloadAuthorizedEbook(
        ebookId: ebook.id,
        store: _downloadStore,
        onProgress: (value) {
          if (!mounted) return;
          setState(() => _downloadProgress[ebook.id] = value);
        },
      );
      if (!mounted) return;
      setState(() {
        _downloadProgress.remove(ebook.id);
        _downloadedIds.add(ebook.id);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${ebook.title} downloaded.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _downloadProgress.remove(ebook.id));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(messageFromDio(error, fallback: 'Unable to download this eBook.')),
        ),
      );
    }
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
                      initialValue: _category.isEmpty ? null : _category,
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
                      const _SectionHeader(title: 'Recently Read'),
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
                      const _SectionHeader(title: 'Featured'),
                      if (data.featured.isEmpty)
                        const _EmptySection(message: 'No featured eBooks yet.')
                      else
                        ...data.featured.map((e) => _EbookTile(
                              ebook: e,
                              downloadState: _downloadState(e),
                              downloadProgress: _downloadProgress[e.id],
                              onTap: () => _openDetails(e),
                              onDownload: () => _handleDownload(e),
                            )),
                      const SizedBox(height: 12),
                      const _SectionHeader(title: 'Recently Added'),
                      if (data.recent.isEmpty)
                        const _EmptySection(message: 'No recent eBooks yet.')
                      else
                        ...data.recent.map((e) => _EbookTile(
                              ebook: e,
                              downloadState: _downloadState(e),
                              downloadProgress: _downloadProgress[e.id],
                              onTap: () => _openDetails(e),
                              onDownload: () => _handleDownload(e),
                            )),
                      const SizedBox(height: 12),
                      const _SectionHeader(title: 'All eBooks'),
                      if (data.data.isEmpty)
                        const _EmptySection(message: 'No eBooks match your filters.')
                      else
                        ...data.data.map((e) => _EbookTile(
                              ebook: e,
                              downloadState: _downloadState(e),
                              downloadProgress: _downloadProgress[e.id],
                              onTap: () => _openDetails(e),
                              onDownload: () => _handleDownload(e),
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
    required this.downloadState,
    required this.onTap,
    required this.onDownload,
    this.downloadProgress,
  });

  final EbookItem ebook;
  final EbookDownloadUiState downloadState;
  final VoidCallback onTap;
  final VoidCallback onDownload;
  final double? downloadProgress;

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
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              ebook.isPremium ? '\$${ebook.price.toStringAsFixed(2)}' : 'Free',
            ),
            EbookDownloadButton(
              state: downloadState,
              progress: downloadProgress,
              onPressed: onDownload,
            ),
          ],
        ),
      ),
    );
  }
}
