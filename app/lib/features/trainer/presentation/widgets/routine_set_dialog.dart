import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../domain/routine_exercise.dart';
import 'catalog_validators.dart';

/// Datos de una serie recolectados por el diálogo, listos para mandar al
/// repositorio (crear o actualizar según el caso).
class RoutineSetInput {
  const RoutineSetInput({
    required this.targetRepsMin,
    required this.targetRepsMax,
    required this.restSeconds,
    this.suggestedWeight,
  });

  final int targetRepsMin;
  final int targetRepsMax;
  final int restSeconds;
  final double? suggestedWeight;
}

/// Abre el diálogo para crear o editar una serie. Devuelve `null` si se
/// canceló.
Future<RoutineSetInput?> showRoutineSetDialog(
  BuildContext context, {
  required int setNumber,
  RoutineExerciseSet? existing,
}) {
  return showDialog<RoutineSetInput>(
    context: context,
    builder: (context) => _RoutineSetDialog(
      setNumber: setNumber,
      existing: existing,
    ),
  );
}

class _RoutineSetDialog extends StatefulWidget {
  const _RoutineSetDialog({required this.setNumber, this.existing});

  final int setNumber;
  final RoutineExerciseSet? existing;

  @override
  State<_RoutineSetDialog> createState() => _RoutineSetDialogState();
}

class _RoutineSetDialogState extends State<_RoutineSetDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _repsMinController = TextEditingController(
    text: widget.existing?.targetRepsMin.toString() ?? '8',
  );
  late final _repsMaxController = TextEditingController(
    text: widget.existing?.targetRepsMax.toString() ?? '12',
  );
  late final _restController = TextEditingController(
    text: widget.existing?.restSeconds.toString() ?? '60',
  );
  late final _weightController = TextEditingController(
    text: widget.existing?.suggestedWeight?.toString() ?? '',
  );

  @override
  void dispose() {
    _repsMinController.dispose();
    _repsMaxController.dispose();
    _restController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final repsMin = int.parse(_repsMinController.text.trim());
    final repsMax = int.parse(_repsMaxController.text.trim());
    if (repsMax < repsMin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'El máximo de repeticiones no puede ser menor que el mínimo.',
          ),
        ),
      );
      return;
    }

    final weightText = _weightController.text.trim().replaceAll(',', '.');
    Navigator.of(context).pop(
      RoutineSetInput(
        targetRepsMin: repsMin,
        targetRepsMax: repsMax,
        restSeconds: int.parse(_restController.text.trim()),
        suggestedWeight: weightText.isEmpty ? null : double.parse(weightText),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.existing == null
            ? 'Serie ${widget.setNumber}'
            : 'Editar serie ${widget.setNumber}',
      ),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _repsMinController,
                      keyboardType: TextInputType.number,
                      validator: (v) => CatalogValidators.positiveInt(
                        v,
                        label: 'el mínimo de repeticiones',
                      ),
                      decoration: const InputDecoration(labelText: 'Reps. mín.'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextFormField(
                      controller: _repsMaxController,
                      keyboardType: TextInputType.number,
                      validator: (v) => CatalogValidators.positiveInt(
                        v,
                        label: 'el máximo de repeticiones',
                      ),
                      decoration: const InputDecoration(labelText: 'Reps. máx.'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _weightController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: CatalogValidators.optionalWeight,
                decoration: const InputDecoration(
                  labelText: 'Peso sugerido (opcional)',
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _restController,
                keyboardType: TextInputType.number,
                validator: (v) =>
                    CatalogValidators.nonNegativeInt(v, label: 'el descanso'),
                decoration: const InputDecoration(
                  labelText: 'Descanso (segundos)',
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Guardar')),
      ],
    );
  }
}
