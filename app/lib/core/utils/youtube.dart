/// Reconoce enlaces de YouTube en sus formas comunes (watch, youtu.be,
/// embed, shorts) y extrae el identificador del video. La misma forma se
/// valida también en la base de datos (constraint de la tabla
/// `exercises`); esto solo evita un viaje al servidor para un enlace que
/// ya se ve mal formado, y sirve para armar la vista previa embebida.
final _youtubePattern = RegExp(
  r'^https?://(www\.)?'
  r'(youtube\.com/(watch\?v=|embed/|shorts/)(?<id1>[A-Za-z0-9_-]{6,})'
  r'|youtu\.be/(?<id2>[A-Za-z0-9_-]{6,}))',
  caseSensitive: false,
);

/// True si [url] tiene forma de enlace de YouTube válido.
bool isYoutubeUrl(String url) => _youtubePattern.hasMatch(url.trim());

/// El identificador del video, o `null` si [url] no es un enlace de
/// YouTube reconocible.
String? youtubeVideoId(String url) {
  final match = _youtubePattern.firstMatch(url.trim());
  if (match == null) return null;
  return match.namedGroup('id1') ?? match.namedGroup('id2');
}

String youtubeThumbnailUrl(String videoId) =>
    'https://img.youtube.com/vi/$videoId/hqdefault.jpg';

String youtubeEmbedUrl(String videoId) =>
    'https://www.youtube.com/embed/$videoId';

String youtubeWatchUrl(String videoId) =>
    'https://www.youtube.com/watch?v=$videoId';
