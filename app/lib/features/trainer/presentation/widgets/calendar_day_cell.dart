import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

/// Cómo se marca que un día tiene sesiones.
enum CalendarDayIndicator {
  /// Número pequeño con el conteo de clientes (escritorio: hay espacio y
  /// el número da más información de un vistazo).
  count,

  /// Un punto de color (teléfono: la celda es chica, un número ahí se ve
  /// apretado — un punto basta para decir "hay algo, toca para ver qué").
  dot,
}

/// Celda de un día del calendario (semana o mes): número del día y, si
/// hay sesiones, un indicador — nunca nombres ni horarios, para que la
/// vista no se rompa con muchos clientes. Dos variantes de fondo:
/// [bordered] (tarjeta suave, escritorio) o [plain] (sin borde, teléfono,
/// donde la separación entre días la da el espaciado, no líneas).
class CalendarDayCell extends StatelessWidget {
  const CalendarDayCell({
    super.key,
    required this.date,
    required this.sessionCount,
    required this.onTap,
    this.weekdayLabel,
    this.isToday = false,
    this.isSelected = false,
    this.isDimmed = false,
    this.bordered = true,
    this.indicator = CalendarDayIndicator.count,
  });

  final DateTime date;
  final int sessionCount;
  final VoidCallback onTap;

  /// Se muestra arriba del número (abreviatura del día de la semana).
  final String? weekdayLabel;
  final bool isToday;
  final bool isSelected;

  /// Días fuera del mes enfocado, en la grilla mensual.
  final bool isDimmed;

  /// `true`: tarjeta con borde suave y esquinas redondeadas (escritorio).
  /// `false`: sin borde, solo el número (teléfono).
  final bool bordered;
  final CalendarDayIndicator indicator;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasSessions = sessionCount > 0;
    final dotColor = AppColors.success;

    final numberCircle = Container(
      width: bordered ? 24 : 34,
      height: bordered ? 24 : 34,
      alignment: Alignment.center,
      decoration: isToday
          ? BoxDecoration(
              color: theme.colorScheme.primary,
              shape: BoxShape.circle,
            )
          : isSelected
              ? BoxDecoration(
                  border: Border.all(color: theme.colorScheme.primary),
                  shape: BoxShape.circle,
                )
              : null,
      child: Text(
        '${date.day}',
        style: (bordered
                ? theme.textTheme.bodyMedium
                : theme.textTheme.titleMedium)
            ?.copyWith(
          color: isToday
              ? theme.colorScheme.onPrimary
              : isDimmed
                  ? theme.colorScheme.onSurface.withValues(alpha: 0.35)
                  : null,
          fontWeight: isToday || !bordered ? FontWeight.w700 : null,
        ),
      ),
    );

    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment:
          bordered ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        if (weekdayLabel != null)
          Text(
            weekdayLabel!,
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        if (weekdayLabel != null) const SizedBox(height: 4),
        numberCircle,
        if (!bordered) ...[
          const SizedBox(height: 4),
          SizedBox(
            height: 6,
            child: hasSessions && indicator == CalendarDayIndicator.dot
                ? Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: dotColor,
                      shape: BoxShape.circle,
                    ),
                  )
                : null,
          ),
        ],
      ],
    );

    if (!bordered) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.sm),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: content,
        ),
      );
    }

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.all(3),
        padding: const EdgeInsets.all(AppSpacing.sm),
        constraints: const BoxConstraints(minHeight: 68),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : AppColors.darkGlassBorder,
          ),
          // Mismo relleno translúcido de las tarjetas del resto de la app
          // (ver cardTheme oscuro): un tono sólido con alpha, sin blur —
          // con muchas celdas juntas el blur por celda se veía parchado.
          color: isSelected
              ? theme.colorScheme.primary.withValues(alpha: 0.18)
              : isToday
                  ? theme.colorScheme.primary.withValues(alpha: 0.12)
                  : AppColors.darkGlassFill,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            content,
            if (hasSessions && indicator == CalendarDayIndicator.count)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 2,
                  ),
                  constraints: const BoxConstraints(minWidth: 18),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.primary.withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$sessionCount',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onPrimary,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
