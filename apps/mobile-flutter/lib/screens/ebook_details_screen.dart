import 'package:flutter/material.dart';

import '../core/ebooks/ebook_service.dart';
import '../core/ebooks/models/ebook_models.dart';
import '../core/subscriptions/trial_manager.dart';
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

  bool _loading = true;
  bool _submitting = false;
  String? _error;
  EbookItem? _ebook;

  bool get _hasPremiumAccess {
    final status = SubscriptionScope.maybeOf(context)?.status;
    return TrialManager.hasPremiumAccess(status);
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
      if (!mounted) return;
      setState(() {
        _ebook = details.data;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load eBook details.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openSubscription() async {
    await Navigator.of(context).pushNamed(SubscriptionScreen.routeName);
    if (!mounted) return;
    SubscriptionScope.maybeOf(context)?.refresh();
  }

  Future<void> _readNow() async {
    if (!_hasPremiumAccess && (_ebook?.isPremium ?? true)) {
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
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open this eBook. Please try again.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ebook = _ebook;
    final premium = _hasPremiumAccess;

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
                        premium
                            ? 'Included with Premium'
                            : 'Requires Premium subscription',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _submitting ? null : _readNow,
                        child: Text(
                          _submitting
                              ? 'Opening...'
                              : premium
                                  ? 'Read Now'
                                  : 'Subscribe to Read',
                        ),
                      ),
                      if (!premium) ...[
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: _submitting ? null : _openSubscription,
                          child: const Text('Subscribe'),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'A Premium subscription unlocks the complete eBook library.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }
}
