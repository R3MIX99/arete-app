import 'package:flutter/material.dart';

/// Escala tipográfica con jerarquía marcada: títulos grandes y texto
/// secundario en gris, según la referencia visual tipo shadcn/ui definida
/// para el proyecto.
///
/// Se construye a partir de la fuente por defecto de Material 3; si más
/// adelante se define una tipografía de marca, solo se reemplaza el
/// `fontFamily` aquí, no en cada pantalla.
class AppTypography {
  const AppTypography._();

  static const String? fontFamily = null;

  static const TextStyle displayLarge = TextStyle(
    fontSize: 32,
    height: 1.2,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontSize: 24,
    height: 1.25,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 18,
    height: 1.3,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    height: 1.5,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    height: 1.45,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle labelSecondary = TextStyle(
    fontSize: 13,
    height: 1.4,
    fontWeight: FontWeight.w500,
  );
}
