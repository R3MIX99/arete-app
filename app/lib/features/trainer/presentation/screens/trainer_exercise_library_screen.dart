import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../domain/exercise.dart';
import '../../data/exercises_providers.dart';
import '../widgets/clients_empty_state.dart';
import '../widgets/exercise_list_tile.dart';

/// Biblioteca de ejercicios del entrenador: buscador, filtros por grupo
/// muscular y equipo, y alta/edición con previsualización de video.
class TrainerExerciseLibraryScreen extends ConsumerStatefulWidget {
  const TrainerExerciseLibraryScreen({super.key});

  @override
  ConsumerState<TrainerExerciseLibraryScreen> createState() =>
      _TrainerExerciseLibraryScreenState();
}

class _TrainerExerciseLibraryScreenState
    extends ConsumerState<TrainerExerciseLibraryScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(exercisesProvider);
    await ref.read(exercisesProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = ref.watch(filteredExercisesProvider);
    final hasFilters = ref.watch(hasActiveExerciseFiltersProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.trainerExerciseNew),
        icon: const AppIcon(AppIconPaths.add, size: 20),
        label: const Text('Nuevo ejercicio'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SearchField(controller: _searchController),
                    const SizedBox(height: AppSpacing.md),
                    const _Filters(),
                  ],
                ),
              ),
            ),
            switch (filtered) {
              AsyncLoading() => const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                ),
              AsyncError(:final error) => SliverFillRemaining(
                  hasScrollBody: false,
                  child: _ErrorState(error: error, onRetry: _refresh),
                ),
              AsyncValue(:final value?) when value.isEmpty =>
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: hasFilters
                      ? const ClientsEmptyState(
                          icon: AppIconPaths.search,
                          title: 'Sin resultados',
                          message:
                              'Ningún ejercicio coincide con la búsqueda o '
                              'los filtros que aplicaste. Prueba '
                              'cambiándolos.',
                        )
                      : ClientsEmptyState(
                          icon: AppIconPaths.fitnessCenter,
                          title: 'Todavía no tienes ejercicios',
                          message:
                              'Crea tu primer ejercicio para empezar a armar '
                              'rutinas.',
                          action: FilledButton.icon(
                            onPressed: () =>
                                context.push(AppRoutes.trainerExerciseNew),
                            icon: const AppIcon(AppIconPaths.add, size: 18),
                            label: const Text('Nuevo ejercicio'),
                          ),
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
                      final exercise = value[index];
                      return ExerciseListTile(
                        exercise: exercise,
                        onTap: () => context.push(
                          AppRoutes.trainerExerciseEdit(exercise.id),
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

class _SearchField extends ConsumerWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(exerciseSearchQueryProvider);

    return TextField(
      controller: controller,
      onChanged: (value) =>
          ref.read(exerciseSearchQueryProvider.notifier).state = value,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'Buscar ejercicio por nombre',
        prefixIcon: const Padding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          child: AppIcon(AppIconPaths.search, size: 20),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 44),
        suffixIcon: query.isEmpty
            ? null
            : IconButton(
                icon: const AppIcon(AppIconPaths.close, size: 18),
                tooltip: 'Limpiar búsqueda',
                onPressed: () {
                  controller.clear();
                  ref.read(exerciseSearchQueryProvider.notifier).state = '';
                },
              ),
      ),
    );
  }
}

class _Filters extends ConsumerWidget {
  const _Filters();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final muscleGroup = ref.watch(exerciseMuscleGroupFilterProvider);
    final equipment = ref.watch(exerciseEquipmentFilterProvider);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final group in MuscleGroup.values) ...[
            _FilterChip(
              label: group.label,
              selected: muscleGroup == group,
              onSelected: (value) => ref
                  .read(exerciseMuscleGroupFilterProvider.notifier)
                  .state = value ? group : null,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          const _VerticalDivider(),
          const SizedBox(width: AppSpacing.sm),
          for (final item in Equipment.values) ...[
            _FilterChip(
              label: item.label,
              selected: equipment == item,
              onSelected: (value) => ref
                  .read(exerciseEquipmentFilterProvider.notifier)
                  .state = value ? item : null,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  const _VerticalDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 24,
      color: Theme.of(context).colorScheme.outline,
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final Object error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ClientsEmptyState(
      icon: AppIconPaths.error,
      title: 'No se pudo cargar tu biblioteca',
      message: error is Exception
          ? (error as dynamic).message as String? ??
              'Intenta de nuevo en unos minutos.'
          : 'Intenta de nuevo en unos minutos.',
      action: OutlinedButton.icon(
        onPressed: onRetry,
        icon: const AppIcon(AppIconPaths.restartAlt, size: 18),
        label: const Text('Reintentar'),
      ),
    );
  }
}
