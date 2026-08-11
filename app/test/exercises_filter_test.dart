// El buscador y los filtros de la biblioteca de ejercicios se resuelven en
// la app, no en la consulta. Estas pruebas fijan esa lógica, igual que
// clients_filter_test.dart hace para el listado de clientes.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/data/exercises_providers.dart';
import 'package:arete/features/trainer/domain/exercise.dart';

Exercise buildExercise({
  required String name,
  required MuscleGroup muscleGroup,
  required Equipment equipment,
}) {
  return Exercise(
    id: name,
    trainerId: 'trainer-1',
    name: name,
    muscleGroup: muscleGroup,
    equipment: equipment,
    createdAt: DateTime(2026),
  );
}

final _exercises = [
  buildExercise(
    name: 'Sentadilla con barra',
    muscleGroup: MuscleGroup.legs,
    equipment: Equipment.barbell,
  ),
  buildExercise(
    name: 'Press de banca',
    muscleGroup: MuscleGroup.chest,
    equipment: Equipment.barbell,
  ),
  buildExercise(
    name: 'Flexiones',
    muscleGroup: MuscleGroup.chest,
    equipment: Equipment.bodyweight,
  ),
];

ProviderContainer buildContainer() {
  final container = ProviderContainer(
    overrides: [exercisesProvider.overrideWith((ref) async => _exercises)],
  );
  addTearDown(container.dispose);
  return container;
}

Future<List<String>> namesOf(ProviderContainer container) async {
  await container.read(exercisesProvider.future);
  return container
          .read(filteredExercisesProvider)
          .valueOrNull
          ?.map((exercise) => exercise.name)
          .toList() ??
      const [];
}

void main() {
  group('filteredExercisesProvider', () {
    test('sin filtros muestra todos los ejercicios', () async {
      final container = buildContainer();
      expect(await namesOf(container), hasLength(3));
    });

    test('el filtro por grupo muscular deja solo los que coinciden', () async {
      final container = buildContainer();
      container.read(exerciseMuscleGroupFilterProvider.notifier).state =
          MuscleGroup.chest;
      expect(await namesOf(container), ['Press de banca', 'Flexiones']);
    });

    test('el filtro por equipo deja solo los que coinciden', () async {
      final container = buildContainer();
      container.read(exerciseEquipmentFilterProvider.notifier).state =
          Equipment.bodyweight;
      expect(await namesOf(container), ['Flexiones']);
    });

    test('grupo muscular y equipo se combinan', () async {
      final container = buildContainer();
      container.read(exerciseMuscleGroupFilterProvider.notifier).state =
          MuscleGroup.chest;
      container.read(exerciseEquipmentFilterProvider.notifier).state =
          Equipment.barbell;
      expect(await namesOf(container), ['Press de banca']);
    });

    test('el buscador encuentra por nombre, sin distinguir mayúsculas', () async {
      final container = buildContainer();
      container.read(exerciseSearchQueryProvider.notifier).state = 'sentadilla';
      expect(await namesOf(container), ['Sentadilla con barra']);
    });

    test('una búsqueda sin coincidencias devuelve lista vacía', () async {
      final container = buildContainer();
      container.read(exerciseSearchQueryProvider.notifier).state = 'zzzz';
      expect(await namesOf(container), isEmpty);
    });
  });

  group('hasActiveExerciseFiltersProvider', () {
    test('distingue "sin ejercicios" de "sin resultados"', () async {
      final container = buildContainer();
      expect(container.read(hasActiveExerciseFiltersProvider), isFalse);

      container.read(exerciseSearchQueryProvider.notifier).state = 'press';
      expect(container.read(hasActiveExerciseFiltersProvider), isTrue);
    });
  });
}
