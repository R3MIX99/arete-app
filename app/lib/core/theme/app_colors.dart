import 'package:flutter/material.dart';

/// Paleta de colores provisional del sistema de diseño de Areté.
///
/// Dirección elegida: minimalismo tipo shadcn/ui (escala de grises fría,
/// casi monocromática, con un único acento de uso deliberado). Sigue
/// siendo una paleta provisional — el cliente todavía debe confirmar los
/// colores finales de marca — pero ya no son valores arbitrarios: la
/// escala de grises y el acento salen de combinar la recomendación de
/// estilo "Minimalism & Swiss Style" con una paleta de color neutra fría,
/// elegidas por encima de paletas más vibrantes de fitness (naranja/verde)
/// porque se pidió explícitamente una estética elegante y minimalista, no
/// una deportiva llamativa.
///
/// Ningún widget debe usar valores de color "a mano"; siempre debe
/// referenciar estos tokens (directamente o a través de [ColorScheme] en
/// app_theme.dart).
class AppColors {
  const AppColors._();

  // Color de acento. Único color con saturación de toda la paleta; se usa
  // con moderación (CTA principal, elemento de navegación activo, foco),
  // nunca como color de fondo extendido.
  static const Color accent = Color(0xFF4F46E5);
  static const Color accentMuted = Color(0xFFEEF0FF);
  static const Color onAccent = Color(0xFFFFFFFF);

  // Escala de grises (modo claro), tono frío y casi neutro.
  static const Color neutral0 = Color(0xFFFFFFFF);
  static const Color neutral50 = Color(0xFFFAFAFA);
  static const Color neutral100 = Color(0xFFF4F4F5);
  static const Color neutral200 = Color(0xFFE4E4E7);
  static const Color neutral300 = Color(0xFFD4D4D8);
  static const Color neutral400 = Color(0xFFA1A1AA);
  static const Color neutral500 = Color(0xFF71717A);
  static const Color neutral600 = Color(0xFF52525B);
  static const Color neutral700 = Color(0xFF3F3F46);
  static const Color neutral800 = Color(0xFF27272A);
  static const Color neutral900 = Color(0xFF18181B);
  static const Color neutral950 = Color(0xFF09090B);

  // Colores semánticos. Se usan siempre acompañados de ícono o texto (no
  // transmiten significado solo con color), según las guías de
  // accesibilidad del sistema de diseño.
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
