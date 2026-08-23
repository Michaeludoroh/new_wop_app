import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// How a posted image is laid out.
enum PostedImageLayout {
  /// Use the image's intrinsic aspect ratio and the available width.
  /// Height follows the image. Never crops or stretches.
  intrinsicWidth,

  /// Letterbox the image inside the parent constraints.
  /// Use only when a surrounding frame is required (video poster, list-tile cover).
  containInFrame,
}

/// Fitted display size that preserves [intrinsic] aspect ratio.
@visibleForTesting
Size postedImageFittedSize({
  required Size intrinsic,
  required double maxWidth,
  double? maxHeight,
}) {
  if (intrinsic.width <= 0 || intrinsic.height <= 0 || maxWidth <= 0) {
    return Size.zero;
  }
  final ratio = intrinsic.width / intrinsic.height;
  var width = maxWidth;
  var height = width / ratio;
  if (maxHeight != null && maxHeight > 0 && height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return Size(width, height);
}

/// Shared display widget for admin-posted media (banners, covers, feed images).
///
/// Does not upload, compress, or transform files. Renders the original pixels
/// with [BoxFit.contain] / [BoxFit.fitWidth] so portrait, landscape, square,
/// and arbitrary ratios stay undistorted.
class MinistryPostedImage extends StatelessWidget {
  const MinistryPostedImage({
    super.key,
    required this.url,
    this.provider,
    this.borderRadius,
    this.fallbackIcon = Icons.broken_image_outlined,
    this.backgroundColor,
    this.layout = PostedImageLayout.intrinsicWidth,
    this.maxHeightFraction = 0.85,
  });

  static const loadingKey = Key('ministry-posted-image-loading');
  static const errorKey = Key('ministry-posted-image-error');
  static const imageKey = Key('ministry-posted-image');

  final String url;
  final ImageProvider? provider;
  final BorderRadius? borderRadius;
  final IconData fallbackIcon;
  final Color? backgroundColor;
  final PostedImageLayout layout;

  /// Soft cap for extremely tall portraits so a feed row cannot exceed
  /// this fraction of the screen. The image is letterboxed, not cropped.
  final double maxHeightFraction;

  @override
  Widget build(BuildContext context) {
    final background = backgroundColor ?? AppColors.imagePlaceholder;
    final trimmed = url.trim();
    final imageProvider = provider ?? (trimmed.isEmpty ? null : NetworkImage(trimmed));

    Widget child;
    if (imageProvider == null) {
      child = _StatusBox(
        key: errorKey,
        color: background,
        expand: layout == PostedImageLayout.containInFrame,
        child: Icon(fallbackIcon, color: AppColors.primaryPurple),
      );
    } else if (layout == PostedImageLayout.containInFrame) {
      child = ColoredBox(
        color: background,
        child: SizedBox.expand(
          child: Image(
            key: imageKey,
            image: imageProvider,
            fit: BoxFit.contain,
            alignment: Alignment.center,
            gaplessPlayback: true,
            frameBuilder: (context, image, frame, wasSynchronouslyLoaded) {
              if (frame == null && !wasSynchronouslyLoaded) {
                return _StatusBox(
                  key: loadingKey,
                  color: background,
                  expand: true,
                  child: const CircularProgressIndicator(),
                );
              }
              return image;
            },
            errorBuilder: (_, __, ___) => _StatusBox(
              key: errorKey,
              color: background,
              expand: true,
              child: Icon(fallbackIcon, color: AppColors.primaryPurple),
            ),
          ),
        ),
      );
    } else {
      child = LayoutBuilder(
        builder: (context, constraints) {
          final media = MediaQuery.sizeOf(context);
          final maxWidth = constraints.maxWidth.isFinite && constraints.maxWidth > 0
              ? constraints.maxWidth
              : media.width;
          final maxHeight = media.height * maxHeightFraction;
          return ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: maxWidth,
              maxHeight: maxHeight,
            ),
            child: ColoredBox(
              color: background,
              child: Image(
                key: imageKey,
                image: imageProvider,
                width: maxWidth,
                fit: BoxFit.contain,
                alignment: Alignment.center,
                gaplessPlayback: true,
                frameBuilder: (context, image, frame, wasSynchronouslyLoaded) {
                  if (frame == null && !wasSynchronouslyLoaded) {
                    return _StatusBox(
                      key: loadingKey,
                      color: background,
                      child: const CircularProgressIndicator(),
                    );
                  }
                  return image;
                },
                errorBuilder: (_, __, ___) => _StatusBox(
                  key: errorKey,
                  color: background,
                  child: Icon(fallbackIcon, color: AppColors.primaryPurple),
                ),
              ),
            ),
          );
        },
      );
    }

    if (borderRadius != null) {
      child = ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}

class _StatusBox extends StatelessWidget {
  const _StatusBox({
    super.key,
    required this.color,
    required this.child,
    this.expand = false,
  });

  final Color color;
  final Widget child;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: color,
      child: SizedBox(
        width: double.infinity,
        height: expand ? double.infinity : 96,
        child: Center(child: child),
      ),
    );
  }
}
