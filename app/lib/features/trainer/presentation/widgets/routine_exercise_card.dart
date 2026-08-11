import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/routines_providers.dart';
import '../../domain/routine_exercise.dart';
import 'routine_set_dialog.dart';

/// Tarjeta de un ejercicio dentro del constructor de rutina: nombre y
/// datos del ejercicio, sus series (cada una editable por separado) y las
/// acciones para agregar series o quitar el ejercicio. El identificador
/// de arrastre para reordenar lo agrega la pantalla que arma la lista
/// (`ReorderableDragStartListener`), no esta tarjeta.
class RoutineExerciseCard extends ConsumerWidget {
  const RoutineExerciseCard({
    super.key,
    required this.routineId,
    required this.routineExercise,
    required this.dragHandle,
  });

  final String routineId;
  final RoutineExercise routineExercise;
  final Widget dragHandle;

  Future<void> _addSet(BuildContext context, WidgetRef ref) async {
    final nextNumber = routineExercise.sets.isEmpty
        ? 1
        : routineExercise.sets.last.setNumber + 1;
    final input = await showRoutineSetDialog(context, setNumber: nextNumber);
    if (input == null) return;

    final repository = ref.read(routinesRepositoryProvider);
    try {
      await repository.addSet(
        routineExerciseId: routineExercise.id,
        setNumber: nextNumber,
        targetRepsMin: input.targetRepsMin,
        targetRepsMax: input.targetRepsMax,
        restSeconds: input.restSeconds,
        suggestedWeight: input.suggestedWeight,
      );
      ref.invalidate(routineDetailProvider(routineId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _editSet(
    BuildContext context,
    WidgetRef ref,
    RoutineExerciseSet set,
  ) async {
    final input = await showRoutineSetDialog(
      context,
      setNumber: set.setNumber,
      existing: set,
    );
    if (input == null) return;

    final repository = ref.read(routinesRepositoryProvider);
    try {
      await repository.updateSet(
        setId: set.id,
        targetRepsMin: input.targetRepsMin,
        targetRepsMax: input.targetRepsMax,
        restSeconds: input.restSeconds,
        suggestedWeight: input.suggestedWeight,
      );
      ref.invalidate(routineDetailProvider(routineId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _deleteSet(BuildContext context, WidgetRef ref, String setId) async {
    final repository = ref.read(routinesRepositoryProvider);
    try {
      await repository.deleteSet(setId);
      ref.invalidate(routineDetailProvider(routineId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _removeExercise(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quitar ejercicio'),
        content: Text(
          '¿Quitar "${routineExercise.exercise.name}" de la rutina? '
          'También se borran sus series.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Quitar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final repository = ref.read(routinesRepositoryProvider);
    try {
      await repository.removeExerciseFromRoutine(routineExercise.id);
      ref.invalidate(routineDetailProvider(routineId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final exercise = routineExercise.exercise;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              dragHandle,
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      exercise.name,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${exercise.muscleGroup.label} · ${exercise.equipment.label}',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const AppIcon(AppIconPaths.delete, size: 20),
                color: AppColors.danger,
                tooltip: 'Quitar ejercicio',
                onPressed: () => _removeExercise(context, ref),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          if (routineExercise.sets.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: Text(
                'Todavía no tiene series.',
                style: theme.textTheme.bodyMedium,
              ),
            )
          else
            Column(
              children: [
                for (final set in routineExercise.sets)
                  _SetRow(
                    set: set,
                    onTap: () => _editSet(context, ref, set),
                    onDelete: () => _deleteSet(context, ref, set.id),
                  ),
              ],
            ),
          const SizedBox(height: AppSpacing.xs),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => _addSet(context, ref),
              icon: const AppIcon(AppIconPaths.add, size: 16),
              label: const Text('Agregar serie'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SetRow extends StatelessWidget {
  const _SetRow({required this.set, required this.onTap, required this.onDelete});

  final RoutineExerciseSet set;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            SizedBox(
              width: 28,
              child: Text(
                '${set.setNumber}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Expanded(
              flex: 2,
              child: Text(
                '${set.repsRangeLabel} reps',
                style: theme.textTheme.bodyMedium,
              ),
            ),
            Expanded(
              flex: 2,
              child: Text(
                set.suggestedWeight == null
                    ? 'Sin peso sugerido'
                    : '${_formatWeight(set.suggestedWeight!)} kg',
                style: theme.textTheme.bodyMedium,
              ),
            ),
            Expanded(
              flex: 2,
              child: Text(
                '${set.restSeconds}s descanso',
                style: theme.textTheme.bodyMedium,
              ),
            ),
            IconButton(
              icon: const AppIcon(AppIconPaths.close, size: 16),
              tooltip: 'Quitar serie',
              onPressed: onDelete,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatWeight(double weight) {
  return weight == weight.roundToDouble()
      ? weight.toStringAsFixed(0)
      : weight.toString();
}
