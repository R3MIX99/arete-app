import 'package:flutter/material.dart';

import '../../../../../core/theme/app_colors.dart';

/// Paleta fija (siempre oscura) de la barra lateral del panel de
/// entrenador.
///
/// A propósito no sigue el `ColorScheme` claro/oscuro del resto de la app:
/// es el mismo patrón que usan paneles tipo Linear/Vercel/Notion, donde la
/// barra lateral queda oscura sin importar el tema del contenido. El
/// usuario pidió puntualmente este estilo (referencia visual "Workly"),
/// así que se trata como una decisión de marca del componente, no como
/// una variante del tema general.
class SidebarColors {
  const SidebarColors._();

  static const Color background = Color(0xFF18181C);
  static const Color surfaceRaised = Color(0xFF1F1F24);

  // Bordes "de cristal": blanco a baja opacidad, no un gris sólido. El
  // truco de fondo con gradiente (ver GlassPanel) es lo que da el efecto
  // de borde que se desvanece de la referencia.
  static const Color glassBorderBright = Color(0x26FFFFFF); // 15%
  static const Color glassBorderDim = Color(0x0DFFFFFF); // 5%

  static const Color textPrimary = Color(0xFFF4F4F5);
  static const Color textSecondary = Color(0xFF9A9AA5);
  static const Color textMuted = Color(0xFF6B6B74);

  static const Color hoverFill = Color(0x0FFFFFFF); // 6%
  static const Color pressFill = Color(0x1AFFFFFF); // 10%

  // Degradé de acento para el ítem activo y el botón de IA: mismo acento
  // de marca (AppColors.accent) hacia un violeta más profundo, siguiendo
  // el gradiente azul→violeta de la referencia.
  static const Color accentStart = AppColors.accent; // #4F46E5
  static const Color accentEnd = Color(0xFF7C3AED);

  static LinearGradient get accentGradient => const LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: [accentStart, accentEnd],
      );

  static const Color danger = AppColors.danger;
}
