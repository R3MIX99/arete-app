/// Escala de espaciado reutilizable. Usar siempre estos tokens en vez de
/// números sueltos para mantener el "mucho espacio en blanco" consistente
/// en toda la app.
class AppSpacing {
  const AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

/// Radios de borde. Las tarjetas y componentes usan bordes redondeados
/// suaves, nunca esquinas duras a 0.
class AppRadius {
  const AppRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double pill = 999;
}
