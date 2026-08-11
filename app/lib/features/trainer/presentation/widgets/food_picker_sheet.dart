import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/foods_providers.dart';
import '../../domain/food.dart';
import 'food_list_tile.dart';

/// Selector de un alimento del catálogo (genérico + propio). Devuelve el
/// [Food] elegido, o `null` si se cerró sin elegir.
Future<Food?> showFoodPicker(BuildContext context) {
  return showModalBottomSheet<Food>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _FoodPickerSheet(),
  );
}

class _FoodPickerSheet extends ConsumerStatefulWidget {
  const _FoodPickerSheet();

  @override
  ConsumerState<_FoodPickerSheet> createState() => _FoodPickerSheetState();
}

class _FoodPickerSheetState extends ConsumerState<_FoodPickerSheet> {
  String _query = '';
  String? _categoryId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final foodsAsync = ref.watch(foodsProvider);
    final categoriesAsync = ref.watch(foodCategoriesProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Elegir alimento', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              TextField(
                onChanged: (value) =>
                    setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar alimento por nombre',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
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
                        ChoiceChip(
                          label: Text(category.name),
                          selected: _categoryId == category.id,
                          showCheckmark: false,
                          onSelected: (selected) => setState(
                            () => _categoryId = selected ? category.id : null,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: foodsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudo cargar el catálogo.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (foods) {
                    final filtered = foods.where((f) {
                      if (_categoryId != null && f.foodCategoryId != _categoryId) {
                        return false;
                      }
                      if (_query.isEmpty) return true;
                      return f.name.toLowerCase().contains(_query);
                    }).toList();

                    if (foods.isEmpty) {
                      return _EmptyCatalog(
                        onCreated: () => Navigator.of(context).pop(),
                      );
                    }
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          'Ningún alimento coincide con la búsqueda.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      );
                    }

                    return ListView.separated(
                      controller: scrollController,
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) {
                        final food = filtered[index];
                        return FoodListTile(
                          food: food,
                          onTap: () => Navigator.of(context).pop(food),
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

class _EmptyCatalog extends StatelessWidget {
  const _EmptyCatalog({required this.onCreated});

  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Todavía no hay alimentos en el catálogo.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () {
              onCreated();
              context.push(AppRoutes.trainerFoodNew);
            },
            icon: const AppIcon(AppIconPaths.add, size: 18),
            label: const Text('Crear alimento'),
          ),
        ],
      ),
    );
  }
}
