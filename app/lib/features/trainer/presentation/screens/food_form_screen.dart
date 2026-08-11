import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../data/foods_providers.dart';
import '../widgets/catalog_validators.dart';

/// Alta de un alimento individual nuevo en el catálogo del entrenador.
class FoodFormScreen extends ConsumerStatefulWidget {
  const FoodFormScreen({super.key});

  @override
  ConsumerState<FoodFormScreen> createState() => _FoodFormScreenState();
}

class _FoodFormScreenState extends ConsumerState<FoodFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _caloriesController = TextEditingController();
  final _proteinController = TextEditingController();
  final _carbsController = TextEditingController();
  final _fatController = TextEditingController();
  final _unitNameController = TextEditingController();
  final _unitGramsController = TextEditingController();

  String? _categoryId;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _caloriesController.dispose();
    _proteinController.dispose();
    _carbsController.dispose();
    _fatController.dispose();
    _unitNameController.dispose();
    _unitGramsController.dispose();
    super.dispose();
  }

  double _parse(String text) =>
      double.parse(text.trim().replaceAll(',', '.'));

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) {
      setState(() => _errorMessage = 'Elige una categoría.');
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
      if (trainerId == null) {
        setState(() {
          _errorMessage =
              'No pudimos identificar tu cuenta. Vuelve a iniciar sesión.';
        });
        return;
      }

      final hasUnit = _unitNameController.text.trim().isNotEmpty;
      await ref.read(foodsRepositoryProvider).createFood(
            trainerId: trainerId,
            foodCategoryId: _categoryId!,
            name: _nameController.text,
            caloriesPer100g: _parse(_caloriesController.text),
            proteinPer100g: _parse(_proteinController.text),
            carbsPer100g: _parse(_carbsController.text),
            fatPer100g: _parse(_fatController.text),
            householdUnitName:
                hasUnit ? _unitNameController.text : null,
            householdUnitGrams:
                hasUnit ? _parse(_unitGramsController.text) : null,
          );
      ref.invalidate(foodsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Alimento creado.')),
      );
      context.pop();
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = (error as dynamic).message as String);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categoriesAsync = ref.watch(foodCategoriesProvider);
    final hasUnitName = _unitNameController.text.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo alimento')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_errorMessage != null) ...[
                      AuthMessageBanner(message: _errorMessage!),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.foodName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del alimento',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Categoría', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    categoriesAsync.when(
                      loading: () =>
                          const CircularProgressIndicator(strokeWidth: 2),
                      error: (_, _) => Text(
                        'No se pudieron cargar las categorías.',
                        style: theme.textTheme.bodyMedium,
                      ),
                      data: (categories) => Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          for (final category in categories)
                            ChoiceChip(
                              label: Text(category.name),
                              selected: _categoryId == category.id,
                              showCheckmark: false,
                              onSelected: _isSaving
                                  ? null
                                  : (selected) => setState(
                                      () => _categoryId =
                                          selected ? category.id : null,
                                    ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Valores por 100 g',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _caloriesController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) => CatalogValidators.nonNegativeNumber(
                              v,
                              label: 'las calorías',
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Calorías',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextFormField(
                            controller: _proteinController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) => CatalogValidators.nonNegativeNumber(
                              v,
                              label: 'la proteína',
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Proteína (g)',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _carbsController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) => CatalogValidators.nonNegativeNumber(
                              v,
                              label: 'los carbohidratos',
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Carbohidratos (g)',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextFormField(
                            controller: _fatController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: (v) => CatalogValidators.nonNegativeNumber(
                              v,
                              label: 'la grasa',
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Grasa (g)',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Medida casera (opcional)',
                      style: theme.textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Para que el cliente no dependa de una báscula, p. ej. '
                      '"huevo mediano" = 50 g.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: _unitNameController,
                            textCapitalization: TextCapitalization.sentences,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Nombre (p. ej. "huevo mediano")',
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            controller: _unitGramsController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            validator: !hasUnitName
                                ? null
                                : (v) => CatalogValidators.positiveNumber(
                                    v,
                                    label: 'los gramos de la medida',
                                  ),
                            decoration: const InputDecoration(
                              labelText: 'Gramos',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: FilledButton(
                        onPressed: _isSaving ? null : _submit,
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Text('Crear alimento'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
