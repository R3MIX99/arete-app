import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/dishes_providers.dart';
import '../../domain/dish.dart';
import '../../domain/meal_type.dart';
import '../widgets/catalog_validators.dart';
import '../widgets/food_picker_sheet.dart';
import '../widgets/food_quantity_dialog.dart';

/// Constructor de platillos.
///
/// Primero pide los datos básicos (nombre, comida del día, descripción);
/// al guardarlos se crea el platillo y la pantalla pasa a modo edición,
/// donde ya se pueden agregar ingredientes uno por uno con su cantidad,
/// viendo en vivo la medida casera y los totales nutricionales.
class DishFormScreen extends ConsumerWidget {
  const DishFormScreen({super.key, this.dishId});

  final String? dishId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (dishId == null) return const _CreateDishScreen();
    return _DishBuilderScreen(dishId: dishId!);
  }
}

class _CreateDishScreen extends ConsumerStatefulWidget {
  const _CreateDishScreen();

  @override
  ConsumerState<_CreateDishScreen> createState() => _CreateDishScreenState();
}

class _CreateDishScreenState extends ConsumerState<_CreateDishScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  MealType _mealType = MealType.breakfast;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

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

      final dish = await ref.read(dishesRepositoryProvider).createDish(
            trainerId: trainerId,
            name: _nameController.text,
            mealType: _mealType,
            description: _descriptionController.text,
          );
      ref.invalidate(dishesProvider);
      if (!mounted) return;
      context.pushReplacement(AppRoutes.trainerDishDetail(dish.id));
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

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo platillo')),
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
                    Text(
                      'Después de guardar podrás agregar ingredientes de tu '
                      'catálogo con su cantidad en gramos.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.dishName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del platillo',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 3,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Descripción (opcional)',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text('Comida del día', style: theme.textTheme.titleMedium),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        for (final type in MealType.values)
                          ChoiceChip(
                            label: Text(type.label),
                            selected: _mealType == type,
                            showCheckmark: false,
                            onSelected: _isSaving
                                ? null
                                : (_) => setState(() => _mealType = type),
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
                            : const Text('Crear platillo y agregar ingredientes'),
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

class _DishBuilderScreen extends ConsumerWidget {
  const _DishBuilderScreen({required this.dishId});

  final String dishId;

  Future<void> _addIngredient(BuildContext context, WidgetRef ref) async {
    final food = await showFoodPicker(context);
    if (food == null || !context.mounted) return;

    final grams = await showFoodQuantityDialog(context, food: food);
    if (grams == null) return;

    final detail = ref.read(dishDetailProvider(dishId)).valueOrNull;
    final nextOrder = detail?.ingredients.length ?? 0;

    try {
      await ref.read(dishesRepositoryProvider).addIngredient(
            dishId: dishId,
            foodId: food.id,
            quantityGrams: grams,
            orderIndex: nextOrder,
          );
      ref.invalidate(dishDetailProvider(dishId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _removeIngredient(
    BuildContext context,
    WidgetRef ref,
    DishIngredient ingredient,
  ) async {
    try {
      await ref.read(dishesRepositoryProvider).removeIngredient(ingredient.id);
      ref.invalidate(dishDetailProvider(dishId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(dishDetailProvider(dishId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detailAsync.valueOrNull?.dish.name ?? 'Platillo'),
      ),
      floatingActionButton: detailAsync.valueOrNull == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _addIngredient(context, ref),
              icon: const AppIcon(AppIconPaths.add, size: 20),
              label: const Text('Agregar ingrediente'),
            ),
      body: switch (detailAsync) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError(:final error) => Center(
            child: Text('No se pudo cargar el platillo: $error'),
          ),
        AsyncValue(:final value?) => _DishBuilderBody(
            detail: value,
            onRemove: (ingredient) =>
                _removeIngredient(context, ref, ingredient),
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }
}

class _DishBuilderBody extends StatelessWidget {
  const _DishBuilderBody({required this.detail, required this.onRemove});

  final DishDetail detail;
  final void Function(DishIngredient ingredient) onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        96,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _TotalStat(
                      label: 'Calorías',
                      value: detail.totalCalories.toStringAsFixed(0),
                    ),
                    _TotalStat(
                      label: 'Proteína',
                      value: '${detail.totalProtein.toStringAsFixed(1)} g',
                    ),
                    _TotalStat(
                      label: 'Carbs',
                      value: '${detail.totalCarbs.toStringAsFixed(1)} g',
                    ),
                    _TotalStat(
                      label: 'Grasa',
                      value: '${detail.totalFat.toStringAsFixed(1)} g',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Ingredientes', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              if (detail.ingredients.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  child: Text(
                    'Agrega alimentos de tu catálogo para armar este '
                    'platillo.',
                    style: theme.textTheme.bodyMedium,
                  ),
                )
              else
                AppCard(
                  child: Column(
                    children: [
                      for (final ingredient in detail.ingredients)
                        _IngredientRow(
                          ingredient: ingredient,
                          onRemove: () => onRemove(ingredient),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TotalStat extends StatelessWidget {
  const _TotalStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(label, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}

class _IngredientRow extends StatelessWidget {
  const _IngredientRow({required this.ingredient, required this.onRemove});

  final DishIngredient ingredient;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final measure = ingredient.householdMeasure;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ingredient.food.name,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  measure == null
                      ? '${ingredient.quantityGrams.toStringAsFixed(0)} g · '
                          '${ingredient.calories.toStringAsFixed(0)} kcal'
                      : '${ingredient.quantityGrams.toStringAsFixed(0)} g '
                          '(≈ $measure) · '
                          '${ingredient.calories.toStringAsFixed(0)} kcal',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const AppIcon(AppIconPaths.close, size: 16),
            tooltip: 'Quitar ingrediente',
            onPressed: onRemove,
          ),
        ],
      ),
    );
  }
}
