import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/exercise.dart';
import 'exercises_repository.dart';

final exercisesRepositoryProvider = Provider<ExercisesRepository>((ref) {
  return ExercisesRepository(ref.watch(supabaseClientProvider));
});

/// Biblioteca completa del entrenador. Igual que con los clientes, el
/// filtrado se hace en la app: un entrenador maneja decenas de ejercicios,
/// no miles, así que buscar y cambiar de filtro es instantáneo sin ir al
/// servidor en cada tecla.
final exercisesProvider = FutureProvider<List<Exercise>>((ref) {
  return ref.watch(exercisesRepositoryProvider).fetchExercises();
});

final exerciseDetailProvider = FutureProvider.family<Exercise, String>((
  ref,
  exerciseId,
) {
  ref.watch(exercisesProvider);
  return ref.watch(exercisesRepositoryProvider).fetchExercise(exerciseId);
});

final exerciseSearchQueryProvider = StateProvider<String>((ref) => '');

/// Filtro por grupo muscular. `null` significa "todos".
final exerciseMuscleGroupFilterProvider = StateProvider<MuscleGroup?>(
  (ref) => null,
);

/// Filtro por equipo. `null` significa "todos".
final exerciseEquipmentFilterProvider = StateProvider<Equipment?>(
  (ref) => null,
);

final filteredExercisesProvider = Provider<AsyncValue<List<Exercise>>>((ref) {
  final exercises = ref.watch(exercisesProvider);
  final query = ref.watch(exerciseSearchQueryProvider).trim().toLowerCase();
  final muscleGroup = ref.watch(exerciseMuscleGroupFilterProvider);
  final equipment = ref.watch(exerciseEquipmentFilterProvider);

  return exercises.whenData((list) {
    return list.where((exercise) {
      if (muscleGroup != null && exercise.muscleGroup != muscleGroup) {
        return false;
      }
      if (equipment != null && exercise.equipment != equipment) return false;
      if (query.isEmpty) return true;
      return exercise.name.toLowerCase().contains(query);
    }).toList();
  });
});

final hasActiveExerciseFiltersProvider = Provider<bool>((ref) {
  return ref.watch(exerciseSearchQueryProvider).trim().isNotEmpty ||
      ref.watch(exerciseMuscleGroupFilterProvider) != null ||
      ref.watch(exerciseEquipmentFilterProvider) != null;
});
