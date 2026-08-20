import 'package:flutter/material.dart';

import '../../core/homepage/homepage_feed_item.dart';
import '../../core/theme/app_colors.dart';

class HomepageFeedCard extends StatelessWidget {
  const HomepageFeedCard({
    super.key,
    required this.item,
    required this.onOpen,
  });

  final HomepageFeedItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final mediaHeight = item.prominent ? 180.0 : 132.0;
    final imageUrl = item.imageUrl?.trim() ?? '';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: mediaHeight,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (imageUrl.isNotEmpty)
                    Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _PlaceholderMedia(
                        icon: item.fallbackIcon,
                        prominent: item.prominent,
                      ),
                    )
                  else
                    _PlaceholderMedia(
                      icon: item.fallbackIcon,
                      prominent: item.prominent,
                    ),
                  Positioned(
                    left: 12,
                    top: 12,
                    child: _EyebrowChip(
                      label: item.eyebrow,
                      prominent: item.prominent,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                  if (item.subtitle != null && item.subtitle!.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      item.subtitle!,
                      style: textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (item.body != null && item.body!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      item.body!,
                      maxLines: item.prominent ? 3 : 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodyMedium?.copyWith(height: 1.4),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (item.timestampLabel != null &&
                          item.timestampLabel!.trim().isNotEmpty)
                        Expanded(
                          child: Text(
                            item.timestampLabel!,
                            style: textTheme.bodySmall?.copyWith(
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        )
                      else
                        const Spacer(),
                      TextButton(
                        onPressed: onOpen,
                        child: Text(item.actionLabel),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EyebrowChip extends StatelessWidget {
  const _EyebrowChip({
    required this.label,
    required this.prominent,
  });

  final String label;
  final bool prominent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: prominent ? AppColors.accentGold : AppColors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.darkText,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _PlaceholderMedia extends StatelessWidget {
  const _PlaceholderMedia({
    required this.icon,
    required this.prominent,
  });

  final IconData icon;
  final bool prominent;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: prominent ? AppColors.lightPurple : AppColors.imagePlaceholder,
      child: Icon(
        icon,
        size: prominent ? 48 : 36,
        color: AppColors.primaryPurple,
      ),
    );
  }
}
