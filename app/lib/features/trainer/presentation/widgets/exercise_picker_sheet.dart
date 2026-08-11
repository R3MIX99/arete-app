import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/exercises_providers.dart';
import '../../domain/exercise.dart';
import 'exercise_list_tile.dart';

/// Selector de ejercicios de la biblioteca para agregar a una rutina.
/// Devuelve el [Exercise] elegido, o `null` si se cerró sin elegir.
Future<Exercise?> showExercisePicker(BuildContext context) {
  return showModalBottomSheet<Exercise>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _ExercisePickerSheet(),
  );
}

class _ExercisePickerSheet extends ConsumerStatefulWidget {
  const _ExercisePickerSheet();

  @override
  ConsumerState<_ExercisePickerSheet> createState() =>
      _ExercisePickerSheetState();
}

class _ExercisePickerSheetState extends ConsumerState<_ExercisePickerSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final exercisesAsync = ref.watch(exercisesProvider);

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
              Text('Agregar ejercicio', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: _searchController,
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                decoration: const InputDecoration(
                  hintText: 'Buscar ejercicio por nombre',
                  prefixIcon: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: AppIcon(AppIconPaths.search, size: 20),
                  ),
                  prefixIconConstraints: BoxConstraints(minWidth: 44),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Expanded(
                child: exercisesAsync.when(
                  loading: () =>
                      const Center(child: CircularProgressIndicator()),
                  error: (error, _) => Center(
                    child: Text(
                      'No se pudo cargar tu biblioteca.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  data: (exercises) {
                    final filtered = _query.isEmpty
                        ? exercises
                        : exercises
                            .where((e) => e.name.toLowerCase().contains(_query))
                            .toList();

                    if (exercises.isEmpty) {
                      return _EmptyLibrary(onCreated: () => Navigator.of(context).pop());
                    }
                    if (filtered.isEmpty) {
                      return Center(
                        child: Text(
                          'Ningún ejercicio coincide con "$_query".',
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
                        final exercise = filtered[index];
                        return ExerciseListTile(
                          exercise: exercise,
                          onTap: () => Navigator.of(context).pop(exercise),
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

class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary({required this.onCreated});

  final VoidCallback onCreated;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Todavía no tienes ejercicios en tu biblioteca.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () {
              onCreated();
              context.push(AppRoutes.trainerExerciseNew);
            },
            icon: const AppIcon(AppIconPaths.add, size: 18),
            label: const Text('Crear ejercicio'),
          ),
        ],
      ),
    );
  }
}
