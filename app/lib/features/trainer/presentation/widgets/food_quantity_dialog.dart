import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../domain/food.dart';
import 'catalog_validators.dart';

/// Abre el diálogo para cargar la cantidad en gramos de un alimento ya
/// elegido, con vista previa en vivo de la medida casera equivalente y
/// las calorías/macros que aporta esa cantidad. Devuelve los gramos, o
/// `null` si se canceló.
Future<double?> showFoodQuantityDialog(
  BuildContext context, {
  required Food food,
  double initialGrams = 100,
}) {
  return showDialog<double>(
    context: context,
    builder: (context) => _FoodQuantityDialog(
      food: food,
      initialGrams: initialGrams,
    ),
  );
}

class _FoodQuantityDialog extends StatefulWidget {
  const _FoodQuantityDialog({required this.food, required this.initialGrams});

  final Food food;
  final double initialGrams;

  @override
  State<_FoodQuantityDialog> createState() => _FoodQuantityDialogState();
}

class _FoodQuantityDialogState extends State<_FoodQuantityDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _gramsController = TextEditingController(
    text: widget.initialGrams.toStringAsFixed(0),
  );
  double? _grams = 100;

  @override
  void initState() {
    super.initState();
    _grams = widget.initialGrams;
  }

  @override
  void dispose() {
    _gramsController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    final grams = double.parse(_gramsController.text.trim().replaceAll(',', '.'));
    Navigator.of(context).pop(grams);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final food = widget.food;
    final grams = _grams ?? 0;
    final measure = food.householdMeasureFor(grams);

    return AlertDialog(
      title: Text(food.name),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _gramsController,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (v) =>
                    CatalogValidators.positiveNumber(v, label: 'la cantidad'),
                onChanged: (value) => setState(() {
                  _grams = double.tryParse(value.trim().replaceAll(',', '.'));
                }),
                decoration: const InputDecoration(labelText: 'Cantidad (g)'),
              ),
              const SizedBox(height: AppSpacing.md),
              if (measure != null) ...[
                Text(
                  '≈ $measure',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
              Text(
                '${food.caloriesFor(grams).toStringAsFixed(0)} kcal · '
                'P ${food.proteinFor(grams).toStringAsFixed(1)} g · '
                'C ${food.carbsFor(grams).toStringAsFixed(1)} g · '
                'G ${food.fatFor(grams).toStringAsFixed(1)} g',
                style: theme.textTheme.bodyMedium,
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
        FilledButton(onPressed: _submit, child: const Text('Agregar')),
      ],
    );
  }
}
