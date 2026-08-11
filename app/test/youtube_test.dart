// La validación del enlace de YouTube vive en dos lugares (el formulario
// de la app y el constraint de la base de datos); estas pruebas fijan lo
// que reconoce la parte del lado de la app, que es la que da la
// retroalimentación inmediata al entrenador.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/core/utils/youtube.dart';

void main() {
  group('isYoutubeUrl', () {
    test('acepta un enlace watch normal', () {
      expect(isYoutubeUrl('https://www.youtube.com/watch?v=SW_C1A-rejs'), isTrue);
    });

    test('acepta un enlace youtu.be corto', () {
      expect(isYoutubeUrl('https://youtu.be/SW_C1A-rejs'), isTrue);
    });

    test('acepta un enlace embed', () {
      expect(isYoutubeUrl('https://www.youtube.com/embed/SW_C1A-rejs'), isTrue);
    });

    test('acepta un enlace shorts', () {
      expect(isYoutubeUrl('https://www.youtube.com/shorts/SW_C1A-rejs'), isTrue);
    });

    test('acepta sin www y con parámetros extra', () {
      expect(
        isYoutubeUrl('https://youtube.com/watch?v=SW_C1A-rejs&t=30s'),
        isTrue,
      );
    });

    test('rechaza un enlace de otro sitio', () {
      expect(isYoutubeUrl('https://vimeo.com/12345678'), isFalse);
    });

    test('rechaza texto que no es una URL', () {
      expect(isYoutubeUrl('no es un enlace'), isFalse);
    });

    test('rechaza un id demasiado corto', () {
      expect(isYoutubeUrl('https://youtu.be/abc'), isFalse);
    });
  });

  group('youtubeVideoId', () {
    test('extrae el id de un enlace watch', () {
      expect(
        youtubeVideoId('https://www.youtube.com/watch?v=SW_C1A-rejs'),
        'SW_C1A-rejs',
      );
    });

    test('extrae el id de un enlace youtu.be', () {
      expect(youtubeVideoId('https://youtu.be/SW_C1A-rejs'), 'SW_C1A-rejs');
    });

    test('devuelve null si no es un enlace de YouTube', () {
      expect(youtubeVideoId('https://vimeo.com/12345678'), isNull);
    });
  });
}
