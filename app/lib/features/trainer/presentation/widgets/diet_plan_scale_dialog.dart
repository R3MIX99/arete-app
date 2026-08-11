import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';

/// Resultado del ajuste proporcional al asignar un plan: el objetivo
/// calórico que se cargó (si se cargó alguno) y el factor por el que se
/// van a multiplicar las porciones del plan.
class DietPlanScaleResult {
  const DietPlanScaleResult({
    required this.scaleFactor,
    this.targetDailyCalories,
  });

  final double scaleFactor;
  final double? targetDailyCalories;
}

/// Antes de asignar un plan, deja ver (y confirmar) el ajuste
/// proporcional de las porciones si el objetivo calórico del cliente
/// difiere del objetivo original del plan. Si el plan no tiene un
/// objetivo calórico definido, no hay base para ajustar y no debería
/// llamarse a este diálogo.
Future<DietPlanScaleResult?> showDietPlanScaleDialog(
  BuildContext context, {
  required double planDailyCalorieTarget,
}) {
  return showDialog<DietPlanScaleResult>(
    context: context,
    builder: (context) => _DietPlanScaleDialog(
      planDailyCalorieTarget: planDailyCalorieTarget,
    ),
  );
}

class _DietPlanScaleDialog extends StatefulWidget {
  const _DietPlanScaleDialog({required this.planDailyCalorieTarget});

  final double planDailyCalorieTarget;

  @override
  State<_DietPlanScaleDialog> createState() => _DietPlanScaleDialogState();
}

class _DietPlanScaleDialogState extends State<_DietPlanScaleDialog> {
  final _controller = TextEditingController();
  double? _clientTarget;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _scaleFactor {
    if (_clientTarget == null || _clientTarget! <= 0) return 1;
    return _clientTarget! / widget.planDailyCalorieTarget;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scaleFactor = _scaleFactor;
    final changePercent = ((scaleFactor - 1) * 100);
    final hasAdjustment = _clientTarget != null && _clientTarget! > 0;

    return AlertDialog(
      title: const Text('Objetivo calórico del cliente'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'El plan está pensado para '
              '${widget.planDailyCalorieTarget.toStringAsFixed(0)} kcal al '
              'día. Si el objetivo de este cliente es distinto, las '
              'porciones se ajustan proporcionalmente.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _controller,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (value) => setState(() {
                _clientTarget = double.tryParse(value.trim().replaceAll(',', '.'));
              }),
              decoration: const InputDecoration(
                labelText: 'Objetivo del cliente (kcal/día, opcional)',
              ),
            ),
            if (hasAdjustment) ...[
              const SizedBox(height: AppSpacing.md),
              Text(
                changePercent.abs() < 1
                    ? 'Prácticamente igual al plan original, sin ajuste.'
                    : 'Las porciones se ${changePercent > 0 ? 'aumentan' : 'reducen'} '
                        'un ${changePercent.abs().toStringAsFixed(0)}%.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(
            const DietPlanScaleResult(scaleFactor: 1),
          ),
          child: const Text('Asignar sin ajustar'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(
            DietPlanScaleResult(
              scaleFactor: scaleFactor,
              targetDailyCalories: hasAdjustment ? _clientTarget : null,
            ),
          ),
          child: const Text('Continuar'),
        ),
      ],
    );
  }
}
