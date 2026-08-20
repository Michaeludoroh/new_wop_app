import 'package:flutter/material.dart';

import '../core/ebooks/ebook_download_store.dart';
import '../core/ebooks/ebook_service.dart';
import '../core/ebooks/models/ebook_models.dart';
import '../core/http/api_error.dart';
import '../core/subscriptions/trial_manager.dart';
import '../widgets/ebooks/ebook_download_button.dart';
import '../widgets/ministry_app_bar_title.dart';
import '../widgets/trial_banner.dart';
import 'pdf_reader_screen.dart';
import 'subscription_screen.dart';

class EbookDetailsScreen extends StatefulWidget {
  const EbookDetailsScreen({super.key, required this.ebookId});

  static const routeName = '/ebooks/details';

  final String ebookId;

  @override
  State<EbookDetailsScreen> createState() => _EbookDetailsScreenState();
}

class _EbookDetailsScreenState extends State<EbookDetailsScreen> {
  final EbookService _service = EbookService();
  final EbookDownloadStore _downloadStore = const EbookDownloadStore();

  bool _loading = true;
  bool _submitting = false;
  String? _error;
  EbookItem? _ebook;
  AccessResponse? _access;
  bool _downloaded = false;
  double? _downloadProgress;

  bool get _hasPremiumAccess {
    final status = SubscriptionScope.maybeOf(context)?.status;
    return TrialManager.hasPremiumAccess(status);
  }

  bool get _canDownload {
    final ebook = _ebook;
    if (ebook == null) return false;
    if (_access?.authorized == true) return true;
    if (!ebook.isPremium || ebook.price <= 0) return true;
    return _hasPremiumAccess;
  }

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
      final details = await _service.getEbookDetails(widget.ebookId);
      AccessResponse? access;
      try {
        access = await _service.getAccess(widget.ebookId);
      } catch (_) {
        access = null;
      }
      var downloaded = false;
      try {
        final progress = await _service.getReadingProgress(widget.ebookId);
        downloaded = progress.data?.downloaded ?? false;
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _ebook = details.data;
        _access = access;
        _downloaded = downloaded;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = messageFromDio(error, fallback: 'Failed to load eBook details.');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openSubscription() async {
    await Navigator.of(context).pushNamed(SubscriptionScreen.routeName);
    if (!mounted) return;
    SubscriptionScope.maybeOf(context)?.refresh();
    await _load();
  }

  Future<void> _readNow() async {
    if (!_canDownload && (_ebook?.isPremium ?? true)) {
      await _openSubscription();
      return;
    }

    setState(() => _submitting = true);
    try {
      final access = await _service.getAccess(widget.ebookId);
      final progress = await _service.getReadingProgress(widget.ebookId);
      if (!mounted) return;

      if (!access.authorized) {
        await _openSubscription();
        return;
      }

      final contentUrl = access.contentUrl;
      if (contentUrl.isEmpty) {
        throw Exception('Missing PDF stream URL');
      }

      await Navigator.of(context).pushNamed(
        PdfReaderScreen.routeName,
        arguments: PdfReaderArgs(
          ebookId: widget.ebookId,
          fileUrl: contentUrl,
          title: _ebook?.title ?? 'eBook',
          initialPage: progress.data?.currentPage ?? 1,
          totalPages: progress.data?.totalPages,
          bookmarkPages: progress.data?.bookmarkPages ?? const [],
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(messageFromDio(error, fallback: 'Unable to open this eBook.')),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _download() async {
    if (!_canDownload) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Purchase to download')),
      );
      await _openSubscription();
      return;
    }

    setState(() => _downloadProgress = 0);
    try {
      await _service.downloadAuthorizedEbook(
        ebookId: widget.ebookId,
        store: _downloadStore,
        onProgress: (value) {
          if (!mounted) return;
          setState(() => _downloadProgress = value);
        },
      );
      if (!mounted) return;
      setState(() {
        _downloaded = true;
        _downloadProgress = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('eBook downloaded.')),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _downloadProgress = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(messageFromDio(error, fallback: 'Unable to download this eBook.')),
        ),
      );
    }
  }

  EbookDownloadUiState get _downloadState {
    if (_downloadProgress != null) return EbookDownloadUiState.downloading;
    if (_downloaded) return EbookDownloadUiState.downloaded;
    if (_canDownload) return EbookDownloadUiState.available;
    return EbookDownloadUiState.notPurchased;
  }

  @override
  Widget build(BuildContext context) {
    final ebook = _ebook;
    final canRead = _canDownload;

    return Scaffold(
      appBar: AppBar(title: const MinistryAppBarTitle(title: 'eBook Details')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ebook == null
                ? Center(child: Text(_error ?? 'eBook unavailable'))
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (ebook.coverImage.isNotEmpty)
                        Center(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              ebook.coverImage,
                              height: 220,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.menu_book, size: 72),
                            ),
                          ),
                        )
                      else
                        const Icon(Icons.menu_book, size: 72),
                      const SizedBox(height: 16),
                      Text(
                        ebook.title,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      Text('By ${ebook.author}'),
                      const SizedBox(height: 8),
                      Text('Category: ${ebook.category}'),
                      const SizedBox(height: 8),
                      Text(ebook.description),
                      const SizedBox(height: 16),
                      Text(
                        canRead
                            ? (ebook.isPremium
                                ? 'Included with WOPP Premium'
                                : 'Available to read and download')
                            : 'WOPP Premium is required to read and download this eBook.',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _submitting ? null : _readNow,
                        child: Text(
                          _submitting
                              ? 'Opening...'
                              : canRead
                                  ? 'Read Now'
                                  : 'Subscribe to Read',
                        ),
                      ),
                      const SizedBox(height: 8),
                      EbookDownloadButton(
                        state: _downloadState,
                        compact: false,
                        progress: _downloadProgress,
                        onPressed: _downloadProgress != null ? null : _download,
                      ),
                      if (!canRead) ...[
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: _submitting ? null : _openSubscription,
                          child: const Text('Subscribe to WOPP Premium'),
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }
}
