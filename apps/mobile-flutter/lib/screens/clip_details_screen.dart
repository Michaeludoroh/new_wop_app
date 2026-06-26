import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../core/clips/clip_service.dart';
import '../core/clips/models/clip_models.dart';
import '../widgets/ministry_app_bar_title.dart';

class ClipDetailsScreen extends StatefulWidget {
  const ClipDetailsScreen({super.key, required this.clipId});

  static const routeName = '/clips/details';

  final String clipId;

  @override
  State<ClipDetailsScreen> createState() => _ClipDetailsScreenState();
}

class _ClipDetailsScreenState extends State<ClipDetailsScreen> {
  final ClipService _service = ClipService();

  bool _loading = true;
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
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final details = await _service.getClipDetails(widget.clipId);
      final controller = VideoPlayerController.networkUrl(Uri.parse(details.data.videoUrl));
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _clip = details.data;
        _controller = controller;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load clip.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _share() async {
    final clip = _clip;
    if (clip == null) return;
    await Clipboard.setData(ClipboardData(text: '${clip.title}\n${clip.videoUrl}'));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Clip link copied to clipboard.')),
    );
  }

  void _togglePlayback() {
    final controller = _controller;
    if (controller == null) return;
    setState(() {
      controller.value.isPlaying ? controller.pause() : controller.play();
    });
  }

  @override
  Widget build(BuildContext context) {
    final clip = _clip;
    final controller = _controller;

    return Scaffold(
      appBar: AppBar(
        title: MinistryAppBarTitle(title: clip?.title ?? 'Clip'),
        actions: [
          IconButton(
            tooltip: 'Share',
            onPressed: _share,
            icon: const Icon(Icons.share_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!))
                : clip == null || controller == null
                    ? const Center(child: Text('Clip not found.'))
                    : ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          AspectRatio(
                            aspectRatio: controller.value.aspectRatio,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                VideoPlayer(controller),
                                IconButton.filled(
                                  iconSize: 40,
                                  onPressed: _togglePlayback,
                                  icon: Icon(
                                    controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          VideoProgressIndicator(controller, allowScrubbing: true),
                          const SizedBox(height: 16),
                          Text(clip.title, style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 8),
                          Text(
                            [clip.speaker, clip.category, clip.durationLabel].where((item) => item != null && item.toString().isNotEmpty).join(' • '),
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
                              children: clip.scriptureReferences.map((ref) => Chip(label: Text(ref))).toList(),
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
