import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class ClipVideoPlayer extends StatelessWidget {
  const ClipVideoPlayer({
    super.key,
    required this.initializing,
    required this.error,
    required this.onRetry,
    required this.onPlayPause,
    this.controller,
    this.posterUrl,
  });

  final bool initializing;
  final String? error;
  final VoidCallback onRetry;
  final VoidCallback onPlayPause;
  final VideoPlayerController? controller;
  final String? posterUrl;

  @override
  Widget build(BuildContext context) {
    final player = controller;
    final ready = player != null && player.value.isInitialized && error == null;

    return Column(
      children: [
        AspectRatio(
          aspectRatio: ready && player.value.aspectRatio > 0
              ? player.value.aspectRatio
              : 16 / 9,
          child: ColoredBox(
            color: Colors.black,
            child: Stack(
              alignment: Alignment.center,
              fit: StackFit.expand,
              children: [
                if (ready)
                  VideoPlayer(player)
                else if (posterUrl != null && posterUrl!.trim().isNotEmpty)
                  Image.network(
                    posterUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                if (initializing)
                  const Center(child: CircularProgressIndicator())
                else if (error != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.videocam_off_outlined, color: Colors.white, size: 40),
                        const SizedBox(height: 12),
                        Text(
                          error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: onRetry, child: const Text('Retry')),
                      ],
                    ),
                  )
                else if (ready)
                  IconButton.filled(
                    iconSize: 48,
                    onPressed: onPlayPause,
                    icon: Icon(
                      player.value.isPlaying ? Icons.pause : Icons.play_arrow,
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (ready) VideoProgressIndicator(player, allowScrubbing: true),
      ],
    );
  }
}
