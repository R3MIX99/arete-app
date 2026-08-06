import 'package:flutter/material.dart';

import '../../../core/theme/app_spacing.dart';

/// Tarjeta base del sistema de diseño: bordes redondeados suaves, sombra
/// sutil y relleno consistente. Toda tarjeta de la app (rutinas, ejercicios,
/// planes de nutrición, métricas del panel, etc.) debe construirse sobre
/// este componente en vez de un `Container` decorado a mano.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: padding, child: child),
    );

    if (onTap == null) return card;

    return Material(
      color: Colors.transparent,
      borderRadius: (theme.cardTheme.shape as RoundedRectangleBorder?)
          ?.borderRadius as BorderRadius?,
      child: InkWell(
        onTap: onTap,
        borderRadius: (theme.cardTheme.shape as RoundedRectangleBorder?)
            ?.borderRadius as BorderRadius?,
        child: card,
      ),
    );
  }
}
