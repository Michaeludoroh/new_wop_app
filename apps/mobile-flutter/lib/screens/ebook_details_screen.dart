import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/ebooks/ebook_service.dart';
import '../core/ebooks/models/ebook_models.dart';
import '../widgets/ministry_app_bar_title.dart';
import 'pdf_reader_screen.dart';

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
  String? _pendingProviderReference;
  EbookItem? _ebook;

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

  Future<void> _buyNow() async {
    setState(() => _submitting = true);
    try {
      final checkout = await _service.initiateEbookCheckout(ebookId: widget.ebookId);
      if (!mounted) return;
      _pendingProviderReference = checkout.providerReference;
      final launched = await launchUrl(
        Uri.parse(checkout.checkoutUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw Exception('Unable to open Flutterwave checkout');
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Complete checkout, then refresh payment status.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Purchase failed')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _refreshPaymentStatus() async {
    final reference = _pendingProviderReference;
    if (reference == null || reference.isEmpty) return;

    setState(() => _submitting = true);
    try {
      final status = await _service.getPaymentStatus(reference);
      if (!mounted) return;
      if (status.isSuccessful) {
        await _service.purchaseEbook(
          ebookId: widget.ebookId,
          paymentReference: reference,
        );
        if (!mounted) return;
        setState(() => _pendingProviderReference = null);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment verified. eBook added to your library.')),
        );
      } else if (status.isFailed) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(status.failureMessage ?? 'Payment failed. Please try again.')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment is still pending.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to refresh payment status.')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _readNow() async {
    setState(() => _submitting = true);
    try {
      final access = await _service.getAccess(widget.ebookId);
      final progress = await _service.getReadingProgress(widget.ebookId);
      if (!mounted) return;
      if (!access.authorized) {
        throw Exception('Access denied');
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
          content: Text('Subscribe or purchase this eBook to gain access.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ebook = _ebook;
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
                      Text(ebook.title,
                          style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 8),
                      Text('By ${ebook.author}'),
                      const SizedBox(height: 8),
                      Text('Category: ${ebook.category}'),
                      const SizedBox(height: 8),
                      Text(ebook.description),
                      const SizedBox(height: 16),
                      Text(
                        ebook.isPremium
                            ? 'Price: \$${ebook.price.toStringAsFixed(2)}'
                            : 'Free',
                      ),
                      const SizedBox(height: 16),
                      if (_pendingProviderReference != null) ...[
                        Card(
                          child: ListTile(
                            title: const Text('Checkout pending'),
                            subtitle: Text(_pendingProviderReference!),
                            trailing: FilledButton(
                              onPressed: _submitting ? null : _refreshPaymentStatus,
                              child: const Text('Refresh status'),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      FilledButton(
                        onPressed: _submitting ? null : _readNow,
                        child: const Text('Read Now'),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: _submitting ? null : _buyNow,
                        child: const Text('Purchase'),
                      ),
                    ],
                  ),
      ),
    );
  }
}
