import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Ícono de la app: dibuja directamente el vector de Material Symbols
/// (ver [AppIconPaths]) en vez de depender de una fuente de íconos.
///
/// Se comporta como el `Icon` de Flutter: si no se le pasa `color` o
/// `size`, toma los del `IconTheme` que lo rodea, para que siga
/// funcionando dentro de `AppBar`, `NavigationRail`, `IconButton`, etc.
class AppIcon extends StatelessWidget {
  const AppIcon(this.path, {super.key, this.size, this.color, this.semanticLabel});

  /// Ruta SVG del ícono, tomada de [AppIconPaths].
  final String path;
  final double? size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final resolvedSize = size ?? iconTheme.size ?? 24;
    final resolvedColor = color ?? iconTheme.color ?? const Color(0xFF000000);

    return SvgPicture.string(
      // Los vectores vienen en la grilla de 960 de Material Symbols; el
      // viewBox se declara aquí y no en cada ruta para no repetirlo 19
      // veces ni arriesgar que una quede con otro sistema de coordenadas.
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">'
      '<path d="$path"/></svg>',
      width: resolvedSize,
      height: resolvedSize,
      colorFilter: ColorFilter.mode(resolvedColor, BlendMode.srcIn),
      semanticsLabel: semanticLabel,
    );
  }
}
