import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../core/clips/clip_service.dart';
import '../core/clips/models/clip_models.dart';
import '../core/http/api_error.dart';
import '../widgets/clip_video_player.dart';
import '../widgets/ministry_app_bar_title.dart';

class ClipDetailsScreen extends StatefulWidget {
  const ClipDetailsScreen({super.key, required this.clipId, this.service});

  static const routeName = '/clips/details';

  final String clipId;
  final ClipService? service;

  @override
  State<ClipDetailsScreen> createState() => _ClipDetailsScreenState();
}

class _ClipDetailsScreenState extends State<ClipDetailsScreen> {
  late final ClipService _service = widget.service ?? ClipService();

  bool _loading = true;
  bool _initializingPlayer = false;
  String? _error;
  ClipItem? _clip;
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller?.removeListener(_onPlayerUpdate);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    await _disposePlayer();

    try {
      final details = await _service.getClipDetails(widget.clipId);
      if (!mounted) return;
      setState(() {
        _clip = details.data;
        _loading = false;
      });
      await _initializePlayer(details.data);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = messageFromDio(error, fallback: 'Failed to load clip.');
        _loading = false;
      });
    }
  }

  Future<void> _initializePlayer(ClipItem clip) async {
    final videoUrl = clip.videoUrl.trim();
    setState(() {
      _initializingPlayer = true;
      _error = null;
    });
    await _disposePlayer();

    if (!clip.hasPlayableVideo) {
      if (!mounted) return;
      setState(() {
        _initializingPlayer = false;
        _error = 'This clip does not have a playable video yet.';
      });
      return;
    }

    try {
      await _service.assertVideoReachable(videoUrl);
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(videoUrl),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );
      controller.addListener(_onPlayerUpdate);
      await controller.initialize();
      if (controller.value.hasError) {
        throw Exception(controller.value.errorDescription ?? 'Video player error');
      }
      await controller.play();
      if (!mounted) {
        controller.removeListener(_onPlayerUpdate);
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _initializingPlayer = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _initializingPlayer = false;
        _error = messageFromDio(error, fallback: 'The video could not be played.');
      });
    }
  }

  Future<void> _disposePlayer() async {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;
    controller.removeListener(_onPlayerUpdate);
    await controller.dispose();
  }

  void _onPlayerUpdate() {
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _share() async {
    final clip = _clip;
    if (clip == null) return;
    await Clipboard.setData(ClipboardData(text: clip.title));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Clip title copied to clipboard.')),
    );
  }

  void _togglePlayback() {
    final controller = _controller;
    if (controller == null) return;
    controller.value.isPlaying ? controller.pause() : controller.play();
  }

  @override
  Widget build(BuildContext context) {
    final clip = _clip;

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: clip?.title ?? 'Clip'),
        actions: [
          IconButton(
            tooltip: 'Share',
            onPressed: clip == null ? null : _share,
            icon: const Icon(Icons.share_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : clip == null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error ?? 'Clip not found.'),
                          const SizedBox(height: 12),
                          TextButton(onPressed: _load, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      ClipVideoPlayer(
                        initializing: _initializingPlayer,
                        error: _controller == null ? _error : null,
                        controller: _controller,
                        posterUrl: clip.thumbnailUrl,
                        onRetry: () => _initializePlayer(clip),
                        onPlayPause: _togglePlayback,
                      ),
                      const SizedBox(height: 16),
                      Text(clip.title, style: Theme.of(context).textTheme.headlineSmall),
                      const SizedBox(height: 8),
                      Text(
                        [
                          clip.speaker,
                          clip.category,
                          clip.durationLabel,
                        ].where((item) => item != null && item.toString().isNotEmpty).join(' • '),
                      ),
                      const SizedBox(height: 8),
                      Text('${clip.viewCount} views'),
                      if (clip.description != null && clip.description!.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(clip.description!),
                      ],
                      if (clip.scriptureReferences.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text('Scripture', style: Theme.of(context).textTheme.titleMedium),
                        Wrap(
                          spacing: 8,
                          children: clip.scriptureReferences
                              .map((ref) => Chip(label: Text(ref)))
                              .toList(),
                        ),
                      ],
                      if (clip.tags.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text('Tags', style: Theme.of(context).textTheme.titleMedium),
                        Wrap(
                          spacing: 8,
                          children: clip.tags.map((tag) => Chip(label: Text('#$tag'))).toList(),
                        ),
                      ],
                    ],
                  ),
      ),
    );
  }
}
