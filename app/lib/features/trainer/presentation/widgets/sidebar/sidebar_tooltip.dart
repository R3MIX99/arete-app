import 'package:flutter/material.dart';

import 'sidebar_colors.dart';

/// Tooltip que aparece a la derecha del elemento en vez de arriba/abajo
/// (el comportamiento por defecto de `Tooltip`). Pensado para los íconos
/// de la barra lateral: a la derecha es hacia donde está el contenido del
/// panel, así que el tooltip nunca tapa nada de la barra ni queda cortado
/// contra el borde de la ventana.
class SidebarTooltip extends StatefulWidget {
  const SidebarTooltip({super.key, required this.message, required this.child});

  final String message;
  final Widget child;

  @override
  State<SidebarTooltip> createState() => _SidebarTooltipState();
}

class _SidebarTooltipState extends State<SidebarTooltip> {
  final _controller = OverlayPortalController();
  final _link = LayerLink();

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _link,
      child: MouseRegion(
        onEnter: (_) => _controller.show(),
        onExit: (_) => _controller.hide(),
        child: OverlayPortal(
          controller: _controller,
          overlayChildBuilder: (context) {
            // Una entrada de Overlay sin envolver en `Positioned` recibe
            // las restricciones ajustadas al tamaño completo de la
            // pantalla, no las de su contenido — por eso sin este
            // `UnconstrainedBox` la burbuja se estiraba para ocupar todo
            // el overlay en vez de quedarse del tamaño del texto.
            return CompositedTransformFollower(
              link: _link,
              targetAnchor: Alignment.centerRight,
              followerAnchor: Alignment.centerLeft,
              offset: const Offset(10, 0),
              child: UnconstrainedBox(
                alignment: Alignment.topLeft,
                child: _Bubble(message: widget.message),
              ),
            );
          },
          child: widget.child,
        ),
      ),
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
