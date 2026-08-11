import 'package:flutter/material.dart';

import '../utils/youtube.dart';
import 'youtube_preview_stub.dart'
    if (dart.library.html) 'youtube_preview_web.dart' as platform;

/// Previsualización embebida de un video de YouTube. En web se dibuja con
/// un iframe real (el mismo reproductor de YouTube); en las demás
/// plataformas, todavía no hay un reproductor embebido nativo, así que se
/// muestra la miniatura y se abre el video en el navegador al tocarla.
class YoutubePreview extends StatelessWidget {
  const YoutubePreview({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    final videoId = youtubeVideoId(url);
    if (videoId == null) return const SizedBox.shrink();

    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: platform.buildYoutubePlayer(videoId),
      ),
    );
  }
}
