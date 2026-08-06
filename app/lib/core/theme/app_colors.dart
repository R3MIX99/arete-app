import 'package:flutter/material.dart';

/// Paleta de colores provisional del sistema de diseño de Areté.
///
/// Es una paleta neutra (blancos, grises y un único color de acento)
/// pensada para reemplazarse sin tocar la estructura de los componentes en
/// cuanto el cliente confirme la paleta final de marca. Ningún widget debe
/// usar valores de color "a mano"; siempre debe referenciar estos tokens
/// (directamente o a través de [ColorScheme] en app_theme.dart).
class AppColors {
  const AppColors._();

  // Color de acento provisional. Único color con saturación de toda la
  // paleta; todo lo demás son escalas de gris.
  static const Color accent = Color(0xFF2F6FED);
  static const Color accentMuted = Color(0xFFE8EFFD);

  // Escala de grises (modo claro).
  static const Color neutral0 = Color(0xFFFFFFFF);
  static const Color neutral50 = Color(0xFFF7F7F8);
  static const Color neutral100 = Color(0xFFF0F1F3);
  static const Color neutral200 = Color(0xFFE3E5E8);
  static const Color neutral300 = Color(0xFFD1D5DB);
  static const Color neutral400 = Color(0xFF9CA3AF);
  static const Color neutral500 = Color(0xFF6B7280);
  static const Color neutral600 = Color(0xFF4B5563);
  static const Color neutral700 = Color(0xFF374151);
  static const Color neutral800 = Color(0xFF1F2937);
  static const Color neutral900 = Color(0xFF111827);
  static const Color neutral950 = Color(0xFF0A0C10);

  // Colores semánticos, también neutros/provisionales.
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color danger = Color(0xFFDC2626);

  // Tokens de superficie y borde reutilizados por el theme.
  static const Color lightSurface = neutral0;
  static const Color lightBackground = neutral50;
  static const Color lightBorder = neutral200;
  static const Color lightTextPrimary = neutral900;
  static const Color lightTextSecondary = neutral500;

  static const Color darkSurface = neutral900;
  static const Color darkBackground = neutral950;
  static const Color darkBorder = neutral700;
  static const Color darkTextPrimary = neutral50;
  static const Color darkTextSecondary = neutral400;
}
