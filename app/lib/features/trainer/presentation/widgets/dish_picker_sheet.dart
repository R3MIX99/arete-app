import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/dishes_providers.dart';
import '../../domain/dish.dart';
import 'dish_list_tile.dart';

/// Selector de un platillo del catálogo (genérico + propio). Devuelve el
/// [Dish] elegido, o `null` si se cerró sin elegir.
Future<Dish?> showDishPicker(BuildContext context) {
  return showModalBottomSheet<Dish>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _DishPickerSheet(),
  );
}

class _DishPickerSheet extends ConsumerStatefulWidget {
  const _DishPickerSheet();

  @override
  ConsumerState<_DishPickerSheet> createState() => _DishPickerSheetState();
}

class _DishPickerSheetState extends ConsumerState<_DishPickerSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dishesAsync = ref.watch(dishesProvider);

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
              Text('Elegir platillo', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              TextField(
                onChanged: (value) =>
                    setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar platillo por nombre',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: dishesAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudieron cargar tus platillos.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (dishes) {
                    final filtered = _query.isEmpty
                        ? dishes
                        : dishes
                            .where((d) => d.name.toLowerCase().contains(_query))
                            .toList();

                    if (dishes.isEmpty) {
                      return _EmptyDishes(
                        onCreated: () => Navigator.of(context).pop(),
                      );
                    }
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          'Ningún platillo coincide con "$_query".',
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
                        final dish = filtered[index];
                        return DishListTile(
                          dish: dish,
                          onTap: () => Navigator.of(context).pop(dish),
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

class _EmptyDishes extends StatelessWidget {
  const _EmptyDishes({required this.onCreated});

  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Todavía no tienes platillos creados.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () {
              onCreated();
              context.push(AppRoutes.trainerDishNew);
            },
            icon: const AppIcon(AppIconPaths.add, size: 18),
            label: const Text('Crear platillo'),
          ),
        ],
      ),
    );
  }
}
