import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

enum EbookDownloadUiState {
  notPurchased,
  available,
  downloading,
  downloaded,
}

class EbookDownloadButton extends StatelessWidget {
  const EbookDownloadButton({
    super.key,
    required this.state,
    required this.onPressed,
    this.compact = true,
    this.progress,
  });

  final EbookDownloadUiState state;
  final VoidCallback? onPressed;
  final bool compact;
  final double? progress;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return IconButton(
        tooltip: _tooltip,
        onPressed: onPressed,
        icon: _icon,
      );
    }

    return FilledButton.icon(
      onPressed: onPressed,
      icon: _icon,
      label: Text(_label),
    );
  }

  String get _tooltip {
    return switch (state) {
      EbookDownloadUiState.notPurchased => 'Purchase to download',
      EbookDownloadUiState.available => 'Download',
      EbookDownloadUiState.downloading => 'Downloading',
      EbookDownloadUiState.downloaded => 'Downloaded',
    };
  }

  String get _label {
    return switch (state) {
      EbookDownloadUiState.notPurchased => 'Purchase to download',
      EbookDownloadUiState.available => 'Download',
      EbookDownloadUiState.downloading => 'Downloading...',
      EbookDownloadUiState.downloaded => 'Downloaded',
    };
  }

  Widget get _icon {
    if (state == EbookDownloadUiState.downloading) {
      return SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          value: progress != null && progress! > 0 ? progress : null,
          color: AppColors.primaryPurple,
        ),
      );
    }
    if (state == EbookDownloadUiState.downloaded) {
      return const Icon(Icons.download_done, color: AppColors.success);
    }
    if (state == EbookDownloadUiState.notPurchased) {
      return const Icon(Icons.lock_outline);
    }
    return const Icon(Icons.download_outlined);
  }
}
