import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Sombras sutiles reutilizables. El sistema de diseño prioriza sombra
/// suave sobre borde duro para separar tarjetas del fondo.
class AppShadows {
  const AppShadows._();

  static List<BoxShadow> card({bool dark = false}) => [
        BoxShadow(
          color: (dark ? Colors.black : AppColors.neutral900)
              .withValues(alpha: dark ? 0.32 : 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];
}
