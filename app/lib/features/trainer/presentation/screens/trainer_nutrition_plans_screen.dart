import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/dishes_providers.dart';
import '../../data/diet_plans_providers.dart';
import '../../data/foods_providers.dart';
import '../../domain/food.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/diet_plan_list_tile.dart';
import '../widgets/dish_list_tile.dart';
import '../widgets/food_list_tile.dart';

/// Planes Nutricionales: arriba, las plantillas reutilizables de
/// alimentación; en "Catálogo", los alimentos individuales y platillos
/// con los que se arman esas plantillas (el módulo "Alimentos y
/// Platillos" vive acá adentro, no como pestaña aparte del panel, para no
/// tocar la barra lateral de 9 módulos ya fija).
class TrainerNutritionPlansScreen extends StatefulWidget {
  const TrainerNutritionPlansScreen({super.key});

  @override
  State<TrainerNutritionPlansScreen> createState() =>
      _TrainerNutritionPlansScreenState();
}

class _TrainerNutritionPlansScreenState
    extends State<TrainerNutritionPlansScreen>
    with SingleTickerProviderStateMixin {
  late final _tabController = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: TabBar(
            controller: _tabController,
            tabs: const [Tab(text: 'Planes'), Tab(text: 'Catálogo')],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: const [_PlansTab(), _CatalogTab()],
          ),
        ),
      ],
    );
  }
}

class _PlansTab extends ConsumerStatefulWidget {
  const _PlansTab();

  @override
  ConsumerState<_PlansTab> createState() => _PlansTabState();
}

class _PlansTabState extends ConsumerState<_PlansTab> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(dietPlansProvider);
    await ref.read(dietPlansProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = ref.watch(filteredDietPlansProvider);
    final query = ref.watch(dietPlanSearchQueryProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.trainerDietPlanNew),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: const Text('Nuevo plan'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(AppSpacing.md),
              sliver: SliverToBoxAdapter(
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) =>
                      ref.read(dietPlanSearchQueryProvider.notifier).state =
                          value,
                  decoration: InputDecoration(
                    hintText: 'Buscar plan por nombre',
                    prefixIcon: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                      child: AppIcon(AppIconPaths.search, size: 20),
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 44),
                    suffixIcon: query.isEmpty
                        ? null
                        : IconButton(
                            icon: const AppIcon(AppIconPaths.close, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              ref
                                  .read(dietPlanSearchQueryProvider.notifier)
                                  .state = '';
                            },
                          ),
                  ),
                ),
              ),
            ),
            switch (filtered) {
              AsyncLoading() => const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                ),
              AsyncError() => SliverFillRemaining(
                  hasScrollBody: false,
                  child: ClientsEmptyState(
                    icon: AppIconPaths.error,
                    title: 'No se pudieron cargar tus planes',
                    message: 'Intenta de nuevo en unos minutos.',
                    action: OutlinedButton.icon(
                      onPressed: _refresh,
                      icon: const AppIcon(AppIconPaths.restartAlt, size: 18),
                      label: const Text('Reintentar'),
                    ),
                  ),
                ),
              AsyncValue(:final value?) when value.isEmpty =>
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: query.isEmpty
                      ? ClientsEmptyState(
                          icon: AppIconPaths.nutrition,
                          title: 'Todavía no tienes planes',
                          message:
                              'Crea tu primer plan de alimentación agregando '
                              'platillos y alimentos a cada comida del día.',
                          action: FilledButton.icon(
                            onPressed: () =>
                                context.push(AppRoutes.trainerDietPlanNew),
                            icon: const AppIcon(AppIconPaths.add, size: 18),
                            label: const Text('Nuevo plan'),
                          ),
                        )
                      : const ClientsEmptyState(
                          icon: AppIconPaths.search,
                          title: 'Sin resultados',
                          message: 'Ningún plan coincide con la búsqueda.',
                        ),
                ),
              AsyncValue(:final value?) => SliverPadding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    0,
                    AppSpacing.md,
                    96,
                  ),
                  sliver: SliverList.separated(
                    itemCount: value.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final plan = value[index];
                      return DietPlanListTile(
                        plan: plan,
                        onTap: () => context.push(
                          AppRoutes.trainerDietPlanDetail(plan.id),
                        ),
                      );
                    },
                  ),
                ),
              _ => const SliverToBoxAdapter(child: SizedBox.shrink()),
            },
          ],
        ),
      ),
    );
  }
}

enum _CatalogKind { foods, dishes }

class _CatalogTab extends ConsumerStatefulWidget {
  const _CatalogTab();

  @override
  ConsumerState<_CatalogTab> createState() => _CatalogTabState();
}

class _CatalogTabState extends ConsumerState<_CatalogTab> {
  _CatalogKind _kind = _CatalogKind.foods;
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _switchKind(_CatalogKind kind) {
    _searchController.clear();
    setState(() => _kind = kind);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(
          _kind == _CatalogKind.foods
              ? AppRoutes.trainerFoodNew
              : AppRoutes.trainerDishNew,
        ),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: Text(_kind == _CatalogKind.foods ? 'Nuevo alimento' : 'Nuevo platillo'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: Row(
              children: [
                Expanded(
                  child: SegmentedButton<_CatalogKind>(
                    segments: const [
                      ButtonSegment(
                        value: _CatalogKind.foods,
                        label: Text('Alimentos'),
                      ),
                      ButtonSegment(
                        value: _CatalogKind.dishes,
                        label: Text('Platillos'),
                      ),
                    ],
                    selected: {_kind},
                    onSelectionChanged: (selection) =>
                        _switchKind(selection.first),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _kind == _CatalogKind.foods
                ? _FoodsList(searchController: _searchController)
                : _DishesList(searchController: _searchController),
          ),
        ],
      ),
    );
  }
}

class _FoodsList extends ConsumerWidget {
  const _FoodsList({required this.searchController});

  final TextEditingController searchController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filtered = ref.watch(filteredFoodsProvider);
    final query = ref.watch(foodSearchQueryProvider);
    final categoriesAsync = ref.watch(foodCategoriesProvider);
    final categoryId = ref.watch(foodCategoryFilterProvider);

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: searchController,
                  onChanged: (value) =>
                      ref.read(foodSearchQueryProvider.notifier).state = value,
                  decoration: InputDecoration(
                    hintText: 'Buscar alimento por nombre',
                    prefixIcon: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                      child: AppIcon(AppIconPaths.search, size: 20),
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 44),
                    suffixIcon: query.isEmpty
                        ? null
                        : IconButton(
                            icon: const AppIcon(AppIconPaths.close, size: 18),
                            onPressed: () {
                              searchController.clear();
                              ref.read(foodSearchQueryProvider.notifier).state =
                                  '';
                            },
                          ),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                categoriesAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (_, _) => const SizedBox.shrink(),
                  data: (categories) => SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final category in categories) ...[
                          FilterChip(
                            label: Text(category.name),
                            selected: categoryId == category.id,
                            showCheckmark: false,
                            onSelected: (selected) => ref
                                .read(foodCategoryFilterProvider.notifier)
                                .state = selected ? category.id : null,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        switch (filtered) {
          AsyncLoading() => const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            ),
          AsyncError() => SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Text('No se pudo cargar el catálogo.')),
            ),
          AsyncValue(:final value?) when value.isEmpty => const SliverFillRemaining(
              hasScrollBody: false,
              child: ClientsEmptyState(
                icon: AppIconPaths.search,
                title: 'Sin resultados',
                message: 'Ningún alimento coincide con la búsqueda o filtro.',
              ),
            ),
          AsyncValue(:final value?) => SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                96,
              ),
              sliver: SliverList.separated(
                itemCount: value.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) => FoodListTile(
                  food: value[index],
                  onTap: () => _showFoodDetail(context, value[index]),
                ),
              ),
            ),
          _ => const SliverToBoxAdapter(child: SizedBox.shrink()),
        },
      ],
    );
  }
}

class _DishesList extends ConsumerWidget {
  const _DishesList({required this.searchController});

  final TextEditingController searchController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filtered = ref.watch(filteredDishesProvider);
    final query = ref.watch(dishSearchQueryProvider);

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.sm,
          ),
          sliver: SliverToBoxAdapter(
            child: TextField(
              controller: searchController,
              onChanged: (value) =>
                  ref.read(dishSearchQueryProvider.notifier).state = value,
              decoration: InputDecoration(
                hintText: 'Buscar platillo por nombre',
                prefixIcon: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                  child: AppIcon(AppIconPaths.search, size: 20),
                ),
                prefixIconConstraints: const BoxConstraints(minWidth: 44),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        icon: const AppIcon(AppIconPaths.close, size: 18),
                        onPressed: () {
                          searchController.clear();
                          ref.read(dishSearchQueryProvider.notifier).state = '';
                        },
                      ),
              ),
            ),
          ),
        ),
        switch (filtered) {
          AsyncLoading() => const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            ),
          AsyncError() => const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Text('No se pudieron cargar tus platillos.')),
            ),
          AsyncValue(:final value?) when value.isEmpty => SliverFillRemaining(
              hasScrollBody: false,
              child: ClientsEmptyState(
                icon: AppIconPaths.restaurant,
                title: query.isEmpty
                    ? 'Todavía no tienes platillos'
                    : 'Sin resultados',
                message: query.isEmpty
                    ? 'Crea tu primer platillo agregando ingredientes de '
                        'tu catálogo de alimentos.'
                    : 'Ningún platillo coincide con la búsqueda.',
              ),
            ),
          AsyncValue(:final value?) => SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                96,
              ),
              sliver: SliverList.separated(
                itemCount: value.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) => DishListTile(
                  dish: value[index],
                  onTap: () => context.push(
                    AppRoutes.trainerDishDetail(value[index].id),
                  ),
                ),
              ),
            ),
          _ => const SliverToBoxAdapter(child: SizedBox.shrink()),
        },
      ],
    );
  }
}

/// Detalle nutricional de solo lectura de un alimento: no hay edición en
/// esta fase, así que tocar la fila muestra sus valores en vez de no
/// hacer nada.
void _showFoodDetail(BuildContext context, Food food) {
  showModalBottomSheet<void>(
    context: context,
    builder: (context) {
      final theme = Theme.of(context);
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(food.name, style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(
                food.categoryName ?? '',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Por 100 g: ${food.caloriesPer100g.toStringAsFixed(0)} kcal · '
                'P ${food.proteinPer100g.toStringAsFixed(1)} g · '
                'C ${food.carbsPer100g.toStringAsFixed(1)} g · '
                'G ${food.fatPer100g.toStringAsFixed(1)} g',
                style: theme.textTheme.bodyLarge,
              ),
              if (food.hasHouseholdUnit) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Medida casera: ${food.householdUnitName} ≈ '
                  '${food.householdUnitGrams!.toStringAsFixed(0)} g',
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ],
          ),
        ),
      );
    },
  );
}
