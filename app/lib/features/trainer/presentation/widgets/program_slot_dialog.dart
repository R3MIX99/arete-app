import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../domain/weekday.dart';

/// Semana y día elegidos para ubicar una rutina dentro de un programa.
class ProgramSlotInput {
  const ProgramSlotInput({required this.weekNumber, required this.dayOfWeek});

  final int weekNumber;
  final Weekday dayOfWeek;
}

/// Abre el diálogo para elegir en qué semana y día del programa va la
/// rutina recién seleccionada. Devuelve `null` si se canceló.
Future<ProgramSlotInput?> showProgramSlotDialog(
  BuildContext context, {
  required int durationWeeks,
  int initialWeek = 1,
  Weekday initialDay = Weekday.monday,
}) {
  return showDialog<ProgramSlotInput>(
    context: context,
    builder: (context) => _ProgramSlotDialog(
      durationWeeks: durationWeeks,
      initialWeek: initialWeek,
      initialDay: initialDay,
    ),
  );
}

class _ProgramSlotDialog extends StatefulWidget {
  const _ProgramSlotDialog({
    required this.durationWeeks,
    required this.initialWeek,
    required this.initialDay,
  });

  final int durationWeeks;
  final int initialWeek;
  final Weekday initialDay;

  @override
  State<_ProgramSlotDialog> createState() => _ProgramSlotDialogState();
}

class _ProgramSlotDialogState extends State<_ProgramSlotDialog> {
  late int _week = widget.initialWeek;
  late Weekday _day = widget.initialDay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AlertDialog(
      title: const Text('Ubicar en el programa'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Semana', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (var week = 1; week <= widget.durationWeeks; week++)
                  ChoiceChip(
                    label: Text('$week'),
                    selected: _week == week,
                    showCheckmark: false,
                    onSelected: (_) => setState(() => _week = week),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Día', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final day in Weekday.values)
                  ChoiceChip(
                    label: Text(day.label),
                    selected: _day == day,
                    showCheckmark: false,
                    onSelected: (_) => setState(() => _day = day),
                  ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(
            ProgramSlotInput(weekNumber: _week, dayOfWeek: _day),
          ),
          child: const Text('Agregar'),
        ),
      ],
    );
  }
}
