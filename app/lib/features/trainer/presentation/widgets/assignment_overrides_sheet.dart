import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/assignments_providers.dart';
import '../../domain/program_routine.dart';
import 'routine_picker_sheet.dart';

/// Hoja para ajustar, día por día, la rutina que un cliente en particular
/// va a hacer dentro de un programa asignado — sin tocar la plantilla del
/// programa (que sigue igual para cualquier otro cliente).
void showAssignmentOverridesSheet(
  BuildContext context, {
  required String assignmentId,
  required String clientName,
  required List<ProgramRoutine> slots,
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (context) => _OverridesSheet(
      assignmentId: assignmentId,
      clientName: clientName,
      slots: slots,
    ),
  );
}

class _OverridesSheet extends ConsumerWidget {
  const _OverridesSheet({
    required this.assignmentId,
    required this.clientName,
    required this.slots,
  });

  final String assignmentId;
  final String clientName;
  final List<ProgramRoutine> slots;

  Future<void> _changeSlot(
    BuildContext context,
    WidgetRef ref,
    ProgramRoutine slot,
  ) async {
    final replacement = await showRoutinePicker(context);
    if (replacement == null) return;

    try {
      await ref.read(assignmentsRepositoryProvider).setOverride(
            assignmentId: assignmentId,
            programRoutineId: slot.id,
            routineId: replacement.id,
          );
      ref.invalidate(overridesForAssignmentProvider(assignmentId));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Rutina ajustada para $clientName.'),
        ),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text((error as dynamic).message as String)),
      );
    }
  }

  Future<void> _clearOverride(
    BuildContext context,
    WidgetRef ref,
    String overrideId,
  ) async {
    try {
      await ref.read(assignmentsRepositoryProvider).removeOverride(overrideId);
      ref.invalidate(overridesForAssignmentProvider(assignmentId));
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Se volvió a la rutina original.')),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text((error as dynamic).message as String)),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final overridesAsync = ref.watch(overridesForAssignmentProvider(assignmentId));

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ajustar rutinas de $clientName', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Reemplaza la rutina de un día puntual solo para este '
                'cliente. La plantilla del programa no cambia.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: overridesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudieron cargar los ajustes.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (overrides) {
                    final overrideBySlot = {
                      for (final o in overrides) o.programRoutineId: o,
                    };

                    return ListView.separated(
                      controller: scrollController,
                      itemCount: slots.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final slot = slots[index];
                        final override = overrideBySlot[slot.id];
                        final effectiveName = override?.routine.name ?? slot.routine.name;

                        return InkWell(
                          onTap: () => _changeSlot(context, ref, slot),
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 90,
                                  child: Text(
                                    'Sem. ${slot.weekNumber} · ${slot.dayOfWeek.label}',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        effectiveName,
                                        style: theme.textTheme.bodyLarge?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      if (override != null)
                                        Text(
                                          'Personalizado para $clientName',
                                          style: theme.textTheme.labelLarge?.copyWith(
                                            color: AppColors.accent,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                if (override != null)
                                  IconButton(
                                    icon: const AppIcon(
                                      AppIconPaths.restartAlt,
                                      size: 18,
                                    ),
                                    tooltip: 'Volver a la rutina original',
                                    onPressed: () =>
                                        _clearOverride(context, ref, override.id),
                                  )
                                else
                                  const AppIcon(AppIconPaths.chevronRight, size: 18),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
