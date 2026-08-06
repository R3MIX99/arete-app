import 'package:flutter/material.dart';

import 'app_spacing.dart';

/// Expone los tokens de [AppRadius] a través de `Theme.of(context)` para
/// que los widgets no necesiten importar el archivo de tokens directamente.
class AppRadiusExtension extends ThemeExtension<AppRadiusExtension> {
  const AppRadiusExtension({
    required this.sm,
    required this.md,
    required this.lg,
    required this.xl,
    required this.pill,
  });

  final double sm;
  final double md;
  final double lg;
  final double xl;
  final double pill;

  static const standard = AppRadiusExtension(
    sm: AppRadius.sm,
    md: AppRadius.md,
    lg: AppRadius.lg,
    xl: AppRadius.xl,
    pill: AppRadius.pill,
  );

  @override
  AppRadiusExtension copyWith({
    double? sm,
    double? md,
    double? lg,
    double? xl,
    double? pill,
  }) {
    return AppRadiusExtension(
      sm: sm ?? this.sm,
      md: md ?? this.md,
      lg: lg ?? this.lg,
      xl: xl ?? this.xl,
      pill: pill ?? this.pill,
    );
  }

  @override
  AppRadiusExtension lerp(ThemeExtension<AppRadiusExtension>? other, double t) {
    if (other is! AppRadiusExtension) return this;
    return AppRadiusExtension(
      sm: _lerpDouble(sm, other.sm, t),
      md: _lerpDouble(md, other.md, t),
      lg: _lerpDouble(lg, other.lg, t),
      xl: _lerpDouble(xl, other.xl, t),
      pill: _lerpDouble(pill, other.pill, t),
    );
  }

  static double _lerpDouble(double a, double b, double t) => a + (b - a) * t;
}
