import 'package:flutter/material.dart';

import '../../../core/theme/app_motion.dart';
import '../../../core/theme/app_spacing.dart';

/// Tarjeta base del sistema de diseño: bordes redondeados suaves, sombra
/// sutil y relleno consistente. Toda tarjeta de la app (rutinas, ejercicios,
/// planes de nutrición, métricas del panel, etc.) debe construirse sobre
/// este componente en vez de un `Container` decorado a mano.
///
/// Cuando es interactiva (`onTap` no nulo), da retroalimentación al
/// presionar siguiendo el principio "responde en pointer-down, no en
/// release" de la skill `apple-design`: se encoge levemente apenas se
/// toca, nunca solo al soltar. La escala nunca llega a 0 (nada en el
/// mundo real aparece o desaparece desde la nada) y la animación de
/// vuelta respeta la preferencia de "reducir movimiento" del sistema.
class AppCard extends StatefulWidget {
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
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borderRadius =
        (theme.cardTheme.shape as RoundedRectangleBorder?)?.borderRadius
            as BorderRadius?;

    final card = Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: widget.padding, child: widget.child),
    );

    if (widget.onTap == null) return card;

    return AnimatedScale(
      scale: _pressed ? AppMotion.pressScale : 1,
      duration: AppMotion.resolve(context, AppMotion.pressFeedback),
      curve: AppMotion.enter,
      child: Material(
        color: Colors.transparent,
        borderRadius: borderRadius,
        child: InkWell(
          onTap: widget.onTap,
          onTapDown: (_) => _setPressed(true),
          onTapCancel: () => _setPressed(false),
          onTapUp: (_) => _setPressed(false),
          borderRadius: borderRadius,
          child: card,
        ),
      ),
    );
  }
}
