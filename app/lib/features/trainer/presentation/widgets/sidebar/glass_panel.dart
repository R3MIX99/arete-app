import 'package:flutter/material.dart';

import 'sidebar_colors.dart';

/// Panel con el efecto "de cristal" de la referencia: un borde de 1px que
/// no es un color sólido, sino un degradé (más brillante arriba, se
/// desvanece hacia abajo), como si la luz pegara en el borde superior de
/// un vidrio.
///
/// Flutter no permite un borde en degradé directamente en `BoxDecoration`
/// (`border` solo acepta color sólido), así que se arma con el truco
/// clásico: un contenedor exterior pintado con el degradé, y uno interior
/// con el color de fondo real, separados por el grosor del borde — lo que
/// se ve del exterior es justo esa franja de 1px.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.color = SidebarColors.surfaceRaised,
    this.borderRadius = const BorderRadius.all(Radius.circular(16)),
    this.padding,
  });

  final Widget child;
  final Color color;
  final BorderRadius borderRadius;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            SidebarColors.glassBorderBright,
            SidebarColors.glassBorderDim,
          ],
        ),
      ),
      padding: const EdgeInsets.all(1),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.all(
            Radius.circular(
              (borderRadius.topLeft.x - 1).clamp(0, double.infinity),
            ),
          ),
        ),
        child: child,
      ),
    );
  }
}
