import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/diet_plans_providers.dart';
import '../../domain/diet_plan.dart';
import 'diet_plan_list_tile.dart';

/// Selector de un plan de alimentación del catálogo del entrenador.
/// Devuelve el [DietPlan] elegido, o `null` si se cerró sin elegir.
Future<DietPlan?> showDietPlanPicker(BuildContext context) {
  return showModalBottomSheet<DietPlan>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _DietPlanPickerSheet(),
  );
}

class _DietPlanPickerSheet extends ConsumerStatefulWidget {
  const _DietPlanPickerSheet();

  @override
  ConsumerState<_DietPlanPickerSheet> createState() =>
      _DietPlanPickerSheetState();
}

class _DietPlanPickerSheetState extends ConsumerState<_DietPlanPickerSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final plansAsync = ref.watch(dietPlansProvider);

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
              Text('Elegir plan de alimentación', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              TextField(
                onChanged: (value) =>
                    setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar plan por nombre',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: plansAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudieron cargar tus planes.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (plans) {
                    final filtered = _query.isEmpty
                        ? plans
                        : plans
                            .where((p) => p.name.toLowerCase().contains(_query))
                            .toList();

                    if (plans.isEmpty) {
                      return _EmptyPlans(
                        onCreated: () => Navigator.of(context).pop(),
                      );
                    }
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          'Ningún plan coincide con "$_query".',
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
                        final plan = filtered[index];
                        return DietPlanListTile(
                          plan: plan,
                          onTap: () => Navigator.of(context).pop(plan),
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

class _EmptyPlans extends StatelessWidget {
  const _EmptyPlans({required this.onCreated});

  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Todavía no tienes planes de alimentación creados.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () {
              onCreated();
              context.push(AppRoutes.trainerDietPlanNew);
            },
            icon: const AppIcon(AppIconPaths.add, size: 18),
            label: const Text('Crear plan'),
          ),
        ],
      ),
    );
  }
}
