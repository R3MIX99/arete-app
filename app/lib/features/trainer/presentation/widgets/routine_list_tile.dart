import 'package:flutter/material.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_grid_card.dart';
import '../../domain/routine.dart';

/// Fila (teléfono) o tarjeta cuadrada (`asGrid`, escritorio) de una
/// rutina en el listado del entrenador.
class RoutineListTile extends StatelessWidget {
  const RoutineListTile({
    super.key,
    required this.routine,
    required this.onTap,
    this.asGrid = false,
  });

  final Routine routine;
  final VoidCallback onTap;
  final bool asGrid;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final leading = Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: theme.colorScheme.primary.withValues(alpha: 0.12),
      ),
      child: AppIcon(
        AppIconPaths.calendarViewMonth,
        size: 20,
        color: theme.colorScheme.primary,
      ),
    );

    final tags = [
      _Tag(label: routine.level.label),
      if (routine.goal != null) _Tag(label: routine.goal!.label),
    ];

    if (asGrid) {
      return AppGridCard(
        leading: leading,
        title: routine.name,
        tags: tags,
        onTap: onTap,
      );
    }

    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          leading,
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  routine.name,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppSpacing.xs),
                Wrap(
                  spacing: AppSpacing.xs,
                  runSpacing: AppSpacing.xs,
                  children: tags,
                ),
              ],
            ),
          ),
          AppIcon(
            AppIconPaths.chevronRight,
            size: 20,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 3),
      decoration: BoxDecoration(
        color: theme.colorScheme.onSurface.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelLarge?.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
