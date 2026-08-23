import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import 'ministry_posted_image.dart';

/// Compact play/pause control that must never expand over the video surface.
class ClipVideoPlayPauseButton extends StatelessWidget {
  const ClipVideoPlayPauseButton({
    super.key,
    required this.isPlaying,
  });

  static const double diameter = 64;

  final bool isPlaying;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0x99000000),
      shape: const CircleBorder(),
      child: SizedBox(
        width: diameter,
        height: diameter,
        child: Icon(
          isPlaying ? Icons.pause : Icons.play_arrow,
          color: Colors.white,
          size: 36,
        ),
      ),
    );
  }
}

/// Restarts from the beginning when Play is pressed after the video ends.
@visibleForTesting
bool clipPlaybackShouldRestart({
  required bool isPlaying,
  required Duration position,
  required Duration duration,
}) {
  return !isPlaying && duration > Duration.zero && position >= duration;
}

Future<void> toggleClipPlayback(VideoPlayerController controller) async {
  final value = controller.value;
  if (!value.isInitialized) {
    return;
  }
  if (value.isPlaying) {
    await controller.pause();
    return;
  }
  if (clipPlaybackShouldRestart(
    isPlaying: value.isPlaying,
    position: value.position,
    duration: value.duration,
  )) {
    await controller.seekTo(Duration.zero);
  }
  await controller.play();
}

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
                  MinistryPostedImage(
                    url: posterUrl!,
                    layout: PostedImageLayout.containInFrame,
                    backgroundColor: Colors.black,
                    fallbackIcon: Icons.videocam_off_outlined,
                  ),
                if (initializing)
                  const ColoredBox(
                    color: Color(0x66000000),
                    child: Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                  )
                else if (error != null)
                  ColoredBox(
                    color: const Color(0x99000000),
                    child: Padding(
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
                    ),
                  )
                else if (ready)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: onPlayPause,
                    child: ColoredBox(
                      color: Colors.transparent,
                      child: Center(
                        child: ClipVideoPlayPauseButton(
                          isPlaying: player.value.isPlaying,
                        ),
                      ),
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
