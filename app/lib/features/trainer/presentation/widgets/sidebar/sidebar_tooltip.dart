import 'package:flutter/material.dart';

import 'sidebar_colors.dart';

/// Tooltip que aparece a la derecha del elemento en vez de arriba/abajo
/// (el comportamiento por defecto de `Tooltip`). Pensado para los íconos
/// de la barra lateral: a la derecha es hacia donde está el contenido del
/// panel, así que el tooltip nunca tapa nada de la barra ni queda cortado
/// contra el borde de la ventana.
///
/// Calcula la posición a mano con `localToGlobal` en vez de usar
/// `CompositedTransformFollower`/`LayerLink`: con esos, la burbuja
/// terminaba apareciendo pegada a un ítem distinto del que en realidad
/// se tocaba (o estirada a toda la pantalla). Este cálculo directo, hecho
/// una sola vez al mostrar el tooltip, es más simple y no depende de que
/// el "líder" y el "seguidor" queden bien enlazados entre fotogramas.
class SidebarTooltip extends StatefulWidget {
  const SidebarTooltip({super.key, required this.message, required this.child});

  final String message;
  final Widget child;

  @override
  State<SidebarTooltip> createState() => _SidebarTooltipState();
}

class _SidebarTooltipState extends State<SidebarTooltip> {
  final _anchorKey = GlobalKey();
  OverlayEntry? _entry;

  void _show() {
    if (_entry != null) return;

    final anchorBox = _anchorKey.currentContext?.findRenderObject() as RenderBox?;
    final overlay = Overlay.maybeOf(context);
    if (anchorBox == null || !anchorBox.attached || overlay == null) return;

    final overlayBox = overlay.context.findRenderObject() as RenderBox;
    final anchorTopLeft = anchorBox.localToGlobal(Offset.zero, ancestor: overlayBox);
    final anchorSize = anchorBox.size;
    // Alto aproximado de la burbuja (relleno vertical + una línea de
    // texto) para poder centrarla verticalmente contra el ícono sin
    // esperar a que se construya primero.
    const bubbleHeight = 28.0;

    _entry = OverlayEntry(
      builder: (context) {
        return Positioned(
          left: anchorTopLeft.dx + anchorSize.width + 10,
          top: anchorTopLeft.dy + (anchorSize.height - bubbleHeight) / 2,
          child: _Bubble(message: widget.message),
        );
      },
    );
    overlay.insert(_entry!);
  }

  void _hide() {
    _entry?.remove();
    _entry = null;
  }

  @override
  void dispose() {
    _entry?.remove();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => _show(),
      onExit: (_) => _hide(),
      child: KeyedSubtree(key: _anchorKey, child: widget.child),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: SidebarColors.surfaceRaised,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: SidebarColors.glassBorderBright),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Text(
          message,
          style: const TextStyle(
            color: SidebarColors.textPrimary,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
