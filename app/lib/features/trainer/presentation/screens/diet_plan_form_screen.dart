import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../auth/presentation/widgets/auth_message_banner.dart';
import '../../../shared/providers/current_user_profile_provider.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/diet_plan_assignments_providers.dart';
import '../../data/diet_plans_providers.dart';
import '../../domain/diet_plan.dart';
import '../../domain/diet_plan_assignment.dart';
import '../../domain/meal_type.dart';
import '../widgets/assign_to_clients_sheet.dart';
import '../widgets/catalog_validators.dart';
import '../widgets/diet_plan_scale_dialog.dart';
import '../widgets/dish_picker_sheet.dart';
import '../widgets/food_picker_sheet.dart';
import '../widgets/food_quantity_dialog.dart';

/// Constructor de planes de alimentación.
///
/// Sin `dietPlanId` primero pide los datos básicos (nombre, objetivo en
/// texto libre, meta calórica diaria); al guardarlos se crea el plan y la
/// pantalla pasa a modo edición, donde ya se pueden agregar platillos o
/// alimentos sueltos a cada comida del día, ver los totales calculados y
/// asignar el plan a clientes.
class DietPlanFormScreen extends ConsumerWidget {
  const DietPlanFormScreen({super.key, this.dietPlanId});

  final String? dietPlanId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (dietPlanId == null) return const _CreatePlanScreen();
    return _PlanBuilderScreen(dietPlanId: dietPlanId!);
  }
}

class _CreatePlanScreen extends ConsumerStatefulWidget {
  const _CreatePlanScreen();

  @override
  ConsumerState<_CreatePlanScreen> createState() => _CreatePlanScreenState();
}

class _CreatePlanScreenState extends ConsumerState<_CreatePlanScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _goalController = TextEditingController();
  final _calorieController = TextEditingController();
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _goalController.dispose();
    _calorieController.dispose();
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

      final calorieText = _calorieController.text.trim();
      final plan = await ref.read(dietPlansRepositoryProvider).createPlan(
            trainerId: trainerId,
            name: _nameController.text,
            goalLabel: _goalController.text,
            dailyCalorieTarget:
                calorieText.isEmpty ? null : double.parse(calorieText),
          );
      ref.invalidate(dietPlansProvider);
      if (!mounted) return;
      context.pushReplacement(AppRoutes.trainerDietPlanDetail(plan.id));
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
      appBar: AppBar(title: const Text('Nuevo plan de alimentación')),
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
                      'Después de guardar podrás agregar platillos o '
                      'alimentos a cada comida del día.',
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    TextFormField(
                      controller: _nameController,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.next,
                      validator: CatalogValidators.dietPlanName,
                      decoration: const InputDecoration(
                        labelText: 'Nombre del plan',
                        hintText: 'Plan definición 1800 kcal',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _goalController,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Objetivo del plan (opcional)',
                        hintText: 'Déficit calórico alto en proteína',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextFormField(
                      controller: _calorieController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (v) {
                        final trimmed = v?.trim() ?? '';
                        if (trimmed.isEmpty) return null;
                        return CatalogValidators.positiveNumber(
                          v,
                          label: 'la meta calórica diaria',
                        );
                      },
                      decoration: const InputDecoration(
                        labelText: 'Meta calórica diaria (opcional)',
                        suffixText: 'kcal/día',
                      ),
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
                            : const Text('Crear plan y armar comidas'),
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

class _PlanBuilderScreen extends ConsumerWidget {
  const _PlanBuilderScreen({required this.dietPlanId});

  final String dietPlanId;

  Future<void> _addToMeal(
    BuildContext context,
    WidgetRef ref,
    MealType mealType,
  ) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const AppIcon(AppIconPaths.restaurant, size: 20),
              title: const Text('Platillo del catálogo'),
              onTap: () => Navigator.of(context).pop('dish'),
            ),
            ListTile(
              leading: const AppIcon(AppIconPaths.nutrition, size: 20),
              title: const Text('Alimento individual'),
              onTap: () => Navigator.of(context).pop('food'),
            ),
          ],
        ),
      ),
    );
    if (choice == null || !context.mounted) return;

    final detail = ref.read(dietPlanDetailProvider(dietPlanId)).valueOrNull;
    final nextOrder =
        detail?.itemsFor(mealType).length ?? detail?.items.length ?? 0;
    final repo = ref.read(dietPlansRepositoryProvider);

    try {
      if (choice == 'dish') {
        final dish = await showDishPicker(context);
        if (dish == null) return;
        await repo.addDishToMeal(
          dietPlanId: dietPlanId,
          mealType: mealType,
          dishId: dish.id,
          orderIndex: nextOrder,
        );
      } else {
        if (!context.mounted) return;
        final food = await showFoodPicker(context);
        if (food == null || !context.mounted) return;
        final grams = await showFoodQuantityDialog(context, food: food);
        if (grams == null) return;
        await repo.addFoodToMeal(
          dietPlanId: dietPlanId,
          mealType: mealType,
          foodId: food.id,
          quantityGrams: grams,
          orderIndex: nextOrder,
        );
      }
      ref.invalidate(dietPlanDetailProvider(dietPlanId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _removeItem(
    BuildContext context,
    WidgetRef ref,
    DietPlanMealItem item,
  ) async {
    try {
      await ref.read(dietPlansRepositoryProvider).removeMealItem(item.id);
      ref.invalidate(dietPlanDetailProvider(dietPlanId));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    }
  }

  Future<void> _assignToClients(
    BuildContext context,
    WidgetRef ref,
    DietPlan plan,
  ) async {
    final selection = await showAssignToClientsSheet(
      context,
      title: 'Asignar "${plan.name}"',
    );
    if (selection == null || !context.mounted) return;

    var scaleFactor = 1.0;
    double? targetCalories;
    if (plan.dailyCalorieTarget != null) {
      final scaleResult = await showDietPlanScaleDialog(
        context,
        planDailyCalorieTarget: plan.dailyCalorieTarget!,
      );
      if (scaleResult == null || !context.mounted) return;
      scaleFactor = scaleResult.scaleFactor;
      targetCalories = scaleResult.targetDailyCalories;
    }

    final trainerId = ref.read(currentUserProfileProvider).valueOrNull?.id;
    if (trainerId == null) return;

    final result =
        await ref.read(dietPlanAssignmentsRepositoryProvider).assignPlanToClients(
              trainerId: trainerId,
              clientIds: selection.clientIds,
              dietPlanId: dietPlanId,
              startDate: selection.startDate,
              targetDailyCalories: targetCalories,
              scaleFactor: scaleFactor,
            );
    ref.invalidate(assignmentsForDietPlanProvider(dietPlanId));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.hasFailures
              ? 'Asignado a ${result.succeeded}. ${result.failedCount} no '
                  'se pudo.'
              : 'Plan asignado a ${result.succeeded} '
                  '${result.succeeded == 1 ? 'cliente' : 'clientes'}.',
        ),
      ),
    );
  }

  Future<void> _editBasicInfo(
    BuildContext context,
    WidgetRef ref,
    DietPlan plan,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: _EditBasicInfoSheet(dietPlanId: dietPlanId, plan: plan),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(dietPlanDetailProvider(dietPlanId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detailAsync.valueOrNull?.plan.name ?? 'Plan'),
        actions: [
          if (detailAsync.valueOrNull != null) ...[
            IconButton(
              icon: const AppIcon(AppIconPaths.personAdd, size: 20),
              tooltip: 'Asignar a clientes',
              onPressed: () =>
                  _assignToClients(context, ref, detailAsync.value!.plan),
            ),
            IconButton(
              icon: const AppIcon(AppIconPaths.edit, size: 20),
              tooltip: 'Editar información',
              onPressed: () =>
                  _editBasicInfo(context, ref, detailAsync.value!.plan),
            ),
          ],
        ],
      ),
      body: switch (detailAsync) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError(:final error) => Center(
            child: Text('No se pudo cargar el plan: $error'),
          ),
        AsyncValue(:final value?) => _PlanBuilderBody(
            dietPlanId: dietPlanId,
            detail: value,
            onAddToMeal: (mealType) => _addToMeal(context, ref, mealType),
            onRemoveItem: (item) => _removeItem(context, ref, item),
          ),
        _ => const SizedBox.shrink(),
      },
    );
  }
}

class _PlanBuilderBody extends ConsumerWidget {
  const _PlanBuilderBody({
    required this.dietPlanId,
    required this.detail,
    required this.onAddToMeal,
    required this.onRemoveItem,
  });

  final String dietPlanId;
  final DietPlanDetail detail;
  final void Function(MealType mealType) onAddToMeal;
  final void Function(DietPlanMealItem item) onRemoveItem;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final plan = detail.plan;
    final assignmentsAsync = ref.watch(assignmentsForDietPlanProvider(dietPlanId));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 700),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: AppSpacing.xs,
                      runSpacing: AppSpacing.xs,
                      children: [
                        if (plan.goalLabel != null &&
                            plan.goalLabel!.isNotEmpty)
                          _Tag(label: plan.goalLabel!),
                        if (plan.dailyCalorieTarget != null)
                          _Tag(
                            label:
                                '${plan.dailyCalorieTarget!.toStringAsFixed(0)} kcal/día',
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Row(
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
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              for (final mealType in MealType.values) ...[
                _MealSection(
                  mealType: mealType,
                  items: detail.itemsFor(mealType),
                  onAdd: () => onAddToMeal(mealType),
                  onRemove: onRemoveItem,
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              const SizedBox(height: AppSpacing.sm),
              Text('Clientes asignados', style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              switch (assignmentsAsync) {
                AsyncLoading() => const Center(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.md),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                AsyncError() => Text(
                    'No se pudieron cargar los clientes asignados.',
                    style: theme.textTheme.bodyMedium,
                  ),
                AsyncValue(:final value?) when value.isEmpty => Text(
                    'Todavía no le asignaste este plan a ningún cliente.',
                    style: theme.textTheme.bodyMedium,
                  ),
                AsyncValue(:final value?) => Column(
                    children: [
                      for (final summary in value) ...[
                        _AssignedClientTile(summary: summary),
                        const SizedBox(height: AppSpacing.sm),
                      ],
                    ],
                  ),
                _ => const SizedBox.shrink(),
              },
            ],
          ),
        ),
      ),
    );
  }
}

class _MealSection extends StatelessWidget {
  const _MealSection({
    required this.mealType,
    required this.items,
    required this.onAdd,
    required this.onRemove,
  });

  final MealType mealType;
  final List<DietPlanMealItem> items;
  final VoidCallback onAdd;
  final void Function(DietPlanMealItem item) onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(mealType.label, style: theme.textTheme.titleMedium),
            ),
            TextButton.icon(
              onPressed: onAdd,
              icon: const AppIcon(AppIconPaths.add, size: 16),
              label: const Text('Agregar'),
            ),
          ],
        ),
        AppCard(
          child: items.isEmpty
              ? Text(
                  'Nada todavía en esta comida.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                )
              : Column(
                  children: [
                    for (final item in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.displayName,
                                    style: theme.textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    '${item.calories.toStringAsFixed(0)} kcal · '
                                    'P ${item.protein.toStringAsFixed(1)} g',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const AppIcon(AppIconPaths.close, size: 16),
                              tooltip: 'Quitar',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(
                                minWidth: 32,
                                minHeight: 32,
                              ),
                              onPressed: () => onRemove(item),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ],
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

class _AssignedClientTile extends StatelessWidget {
  const _AssignedClientTile({required this.summary});

  final DietPlanAssignmentSummary summary;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assignment = summary.assignment;

    return AppCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary.clientName,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Desde el '
                  '${DateFormat('d MMM y', 'es_419').format(assignment.startDate)}'
                  '${assignment.scaleFactor != 1 ? ' · ajustado ${(assignment.scaleFactor * 100).toStringAsFixed(0)}%' : ''}',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
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
        color: theme.colorScheme.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelLarge?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _EditBasicInfoSheet extends ConsumerStatefulWidget {
  const _EditBasicInfoSheet({required this.dietPlanId, required this.plan});

  final String dietPlanId;
  final DietPlan plan;

  @override
  ConsumerState<_EditBasicInfoSheet> createState() =>
      _EditBasicInfoSheetState();
}

class _EditBasicInfoSheetState extends ConsumerState<_EditBasicInfoSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.plan.name);
  late final _goalController =
      TextEditingController(text: widget.plan.goalLabel ?? '');
  late final _calorieController = TextEditingController(
    text: widget.plan.dailyCalorieTarget?.toStringAsFixed(0) ?? '',
  );
  bool _isSaving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _goalController.dispose();
    _calorieController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    try {
      final calorieText = _calorieController.text.trim();
      await ref.read(dietPlansRepositoryProvider).updatePlan(
            planId: widget.dietPlanId,
            name: _nameController.text,
            goalLabel: _goalController.text,
            dailyCalorieTarget:
                calorieText.isEmpty ? null : double.parse(calorieText),
          );
      ref.invalidate(dietPlansProvider);
      ref.invalidate(dietPlanDetailProvider(widget.dietPlanId));
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text((error as dynamic).message as String)));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Editar información', style: theme.textTheme.titleLarge),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _nameController,
              textCapitalization: TextCapitalization.sentences,
              validator: CatalogValidators.dietPlanName,
              decoration: const InputDecoration(labelText: 'Nombre'),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _goalController,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Objetivo del plan (opcional)',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _calorieController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                final trimmed = v?.trim() ?? '';
                if (trimmed.isEmpty) return null;
                return CatalogValidators.positiveNumber(
                  v,
                  label: 'la meta calórica diaria',
                );
              },
              decoration: const InputDecoration(
                labelText: 'Meta calórica diaria (opcional)',
                suffixText: 'kcal/día',
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: _isSaving ? null : _submit,
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Text('Guardar cambios'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
