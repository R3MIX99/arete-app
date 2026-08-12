import 'package:flutter/material.dart';

/// Celda minimalista de un día del calendario (usada tanto en la fila de
/// la semana como en la grilla del mes): número del día, y si hay
/// sesiones ese día, solo un número pequeño en la esquina — nunca nombres
/// ni horarios, para que la vista no se rompa con muchos clientes.
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
  });

  final DateTime date;
  final int sessionCount;
  final VoidCallback onTap;

  /// Solo se muestra en la vista de semana (en la de mes va la fila de
  /// encabezado aparte).
  final String? weekdayLabel;
  final bool isToday;
  final bool isSelected;

  /// Días fuera del mes enfocado, en la grilla mensual.
  final bool isDimmed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final outline = theme.colorScheme.outlineVariant;

    return InkWell(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          border: Border.all(color: outline),
          color: isSelected
              ? theme.colorScheme.primary.withValues(alpha: 0.10)
              : isToday
                  ? theme.colorScheme.primary.withValues(alpha: 0.05)
                  : null,
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (weekdayLabel != null)
                  Text(
                    weekdayLabel!,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.55,
                      ),
                    ),
                  ),
                if (weekdayLabel != null) const SizedBox(height: 2),
                Container(
                  width: 22,
                  height: 22,
                  alignment: Alignment.center,
                  decoration: isToday
                      ? BoxDecoration(
                          color: theme.colorScheme.primary,
                          shape: BoxShape.circle,
                        )
                      : null,
                  child: Text(
                    '${date.day}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isToday
                          ? theme.colorScheme.onPrimary
                          : isDimmed
                              ? theme.colorScheme.onSurface.withValues(
                                  alpha: 0.35,
                                )
                              : null,
                      fontWeight: isToday ? FontWeight.w700 : null,
                    ),
                  ),
                ),
              ],
            ),
            if (sessionCount > 0)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
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
