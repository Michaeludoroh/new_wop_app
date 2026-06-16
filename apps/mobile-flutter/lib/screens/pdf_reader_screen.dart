import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

import '../core/ebooks/ebook_service.dart';
import '../core/theme/app_colors.dart';
import '../widgets/ministry_app_bar_title.dart';

class PdfReaderArgs {
  PdfReaderArgs({
    required this.ebookId,
    required this.fileUrl,
    required this.title,
    this.initialPage = 1,
    this.totalPages,
    this.bookmarkPages = const <int>[],
  });

  final String ebookId;
  final String fileUrl;
  final String title;
  final int initialPage;
  final int? totalPages;
  final List<int> bookmarkPages;
}

class PdfReaderScreen extends StatefulWidget {
  const PdfReaderScreen({super.key, required this.args, this.service});

  static const routeName = '/ebooks/reader';

  final PdfReaderArgs args;
  final EbookService? service;

  @override
  State<PdfReaderScreen> createState() => _PdfReaderScreenState();
}

class _PdfReaderScreenState extends State<PdfReaderScreen> {
  late final EbookService _service = widget.service ?? EbookService();

  PdfControllerPinch? _controller;
  bool _loading = true;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;
  final Set<int> _bookmarks = <int>{};

  double get _progress =>
      _totalPages > 0 ? (_currentPage / _totalPages).clamp(0, 1) : 0;

  @override
  void initState() {
    super.initState();
    _bookmarks.addAll(widget.args.bookmarkPages);
    _currentPage = widget.args.initialPage;
    _totalPages = widget.args.totalPages ?? 1;
    _loadDocument();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _loadDocument() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await _service.downloadPdfBytes(widget.args.fileUrl);
      final bytes = response.data;
      if (bytes == null || bytes.isEmpty) {
        throw Exception('Empty PDF response');
      }

      final document = await PdfDocument.openData(Uint8List.fromList(bytes));
      _totalPages = document.pagesCount;
      _controller = PdfControllerPinch(
        document: Future.value(document),
        initialPage: widget.args.initialPage.clamp(1, _totalPages),
      );
      _currentPage = widget.args.initialPage.clamp(1, _totalPages);
    } catch (_) {
      _error = 'Unable to open this eBook PDF.';
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _saveProgress() async {
    await _service.updateReadingProgress(
      ebookId: widget.args.ebookId,
      currentPage: _currentPage,
      totalPages: _totalPages,
      progressPct: _progress * 100,
      bookmarkPages: _bookmarks.toList()..sort(),
    );
  }

  Future<void> _toggleBookmark() async {
    setState(() {
      if (_bookmarks.contains(_currentPage)) {
        _bookmarks.remove(_currentPage);
      } else {
        _bookmarks.add(_currentPage);
      }
    });
    await _saveProgress();
  }

  @override
  Widget build(BuildContext context) {
    final isBookmarked = _bookmarks.contains(_currentPage);

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: widget.args.title),
        actions: [
          IconButton(
            tooltip: isBookmarked ? 'Remove bookmark' : 'Add bookmark',
            onPressed: _loading || _error != null ? null : _toggleBookmark,
            icon: Icon(
              isBookmarked ? Icons.bookmark : Icons.bookmark_border,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: _loadDocument,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : Column(
                    children: [
                      LinearProgressIndicator(value: _progress),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Text('Page $_currentPage / $_totalPages'),
                            const Spacer(),
                            Text('${(_progress * 100).toStringAsFixed(0)}%'),
                            if (_progress >= 0.99) ...[
                              const SizedBox(width: 8),
                              const Icon(Icons.check_circle, color: AppColors.success),
                            ],
                          ],
                        ),
                      ),
                      Expanded(
                        child: PdfViewPinch(
                          controller: _controller!,
                          onPageChanged: (page) {
                            setState(() => _currentPage = page);
                            _saveProgress();
                          },
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}
