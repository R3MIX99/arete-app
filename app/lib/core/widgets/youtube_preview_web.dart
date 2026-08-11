// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';

import '../utils/youtube.dart';

/// `registerViewFactory` lanza si se llama dos veces con el mismo tipo de
/// vista (por ejemplo, al reconstruir el widget). Se registra una sola vez
/// por video y se reutiliza.
final Set<String> _registeredViewTypes = {};

Widget buildYoutubePlayer(String videoId) {
  final viewType = 'youtube-player-$videoId';
  if (_registeredViewTypes.add(viewType)) {
    ui_web.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
      return html.IFrameElement()
        ..src = youtubeEmbedUrl(videoId)
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; '
            'gyroscope; picture-in-picture; web-share'
        ..allowFullscreen = true;
    });
  }
  return HtmlElementView(viewType: viewType);
}
