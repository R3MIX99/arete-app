import 'package:flutter/material.dart';

/// Escala tipográfica con jerarquía marcada: títulos grandes y texto
/// secundario en gris, según la referencia visual tipo shadcn/ui definida
/// para el proyecto.
///
/// Fuente: Inter (par "Minimal Swiss" — una sola familia con variación de
/// peso, sin mezclar tipografías, la elección más limpia para un panel
/// tipo dashboard). Se empaqueta como asset local en `assets/fonts/` para
/// que la app no dependa de conexión a internet.
///
/// El interlineado y el tracking (letterSpacing) siguen el principio de
/// tamaño óptico de Apple: los títulos grandes llevan tracking negativo
/// (las letras se leen demasiado separadas al crecer) e interlineado
/// ajustado; el texto de cuerpo se queda cerca de 0 e interlineado más
/// suelto para lectura prolongada.
class AppTypography {
  const AppTypography._();

  static const String fontFamily = 'Inter';

  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 32,
    height: 1.2,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 24,
    height: 1.25,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 18,
    height: 1.3,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16,
    height: 1.5,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 14,
    height: 1.45,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle labelSecondary = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13,
    height: 1.4,
    fontWeight: FontWeight.w500,
  );
}
