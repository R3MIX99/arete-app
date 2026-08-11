import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_icon_paths.dart';
import '../utils/youtube.dart';
import 'app_icon.dart';

/// En plataformas que no son web todavía no hay un reproductor embebido:
/// se muestra la miniatura del video y, al tocarla, se abre en el
/// navegador o en la app de YouTube.
Widget buildYoutubePlayer(String videoId) {
  return _ThumbnailFallback(videoId: videoId);
}

class _ThumbnailFallback extends StatelessWidget {
  const _ThumbnailFallback({required this.videoId});

  final String videoId;

  Future<void> _open() async {
    final uri = Uri.parse(youtubeWatchUrl(videoId));
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _open,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(color: Colors.black),
          Image.network(
            youtubeThumbnailUrl(videoId),
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) =>
                const SizedBox.shrink(),
          ),
          Center(
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black45,
              ),
              child: const AppIcon(
                AppIconPaths.playCircle,
                size: 40,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
