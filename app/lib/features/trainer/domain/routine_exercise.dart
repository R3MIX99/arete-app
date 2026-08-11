import 'exercise.dart';
import 'routine.dart';

/// Una serie individual dentro de un ejercicio de la rutina. Cada serie es
/// su propio registro (no un número fijo repetido) para poder armar
/// esquemas como series piramidales: primera serie más liviana y con más
/// repeticiones, última más pesada y con menos.
class RoutineExerciseSet {
  const RoutineExerciseSet({
    required this.id,
    required this.routineExerciseId,
    required this.setNumber,
    required this.targetRepsMin,
    required this.targetRepsMax,
    required this.restSeconds,
    this.suggestedWeight,
  });

  final String id;
  final String routineExerciseId;
  final int setNumber;
  final int targetRepsMin;
  final int targetRepsMax;
  final int restSeconds;
  final double? suggestedWeight;

  /// Rango de repeticiones en texto, p. ej. "8-12" o "10" cuando el mínimo
  /// y el máximo coinciden.
  String get repsRangeLabel => targetRepsMin == targetRepsMax
      ? '$targetRepsMin'
      : '$targetRepsMin-$targetRepsMax';

  RoutineExerciseSet copyWith({
    int? setNumber,
    int? targetRepsMin,
    int? targetRepsMax,
    int? restSeconds,
    double? suggestedWeight,
    bool clearSuggestedWeight = false,
  }) {
    return RoutineExerciseSet(
      id: id,
      routineExerciseId: routineExerciseId,
      setNumber: setNumber ?? this.setNumber,
      targetRepsMin: targetRepsMin ?? this.targetRepsMin,
      targetRepsMax: targetRepsMax ?? this.targetRepsMax,
      restSeconds: restSeconds ?? this.restSeconds,
      suggestedWeight: clearSuggestedWeight
          ? null
          : (suggestedWeight ?? this.suggestedWeight),
    );
  }

  factory RoutineExerciseSet.fromJson(Map<String, dynamic> json) {
    return RoutineExerciseSet(
      id: json['id'] as String,
      routineExerciseId: json['routine_exercise_id'] as String,
      setNumber: json['set_number'] as int,
      targetRepsMin: json['target_reps_min'] as int,
      targetRepsMax: json['target_reps_max'] as int,
      restSeconds: json['rest_seconds'] as int,
      suggestedWeight: (json['suggested_weight'] as num?)?.toDouble(),
    );
  }
}

/// Un ejercicio de la biblioteca dentro de una rutina, con su posición,
/// notas y series. [exercise] viaja junto (join) para mostrar nombre,
/// grupo muscular y video sin una consulta aparte.
class RoutineExercise {
  const RoutineExercise({
    required this.id,
    required this.routineId,
    required this.orderIndex,
    required this.exercise,
    required this.sets,
    this.notes,
  });

  final String id;
  final String routineId;
  final int orderIndex;
  final Exercise exercise;
  final List<RoutineExerciseSet> sets;
  final String? notes;

  factory RoutineExercise.fromJson(Map<String, dynamic> json) {
    final setsJson = json['routine_exercise_sets'] as List<dynamic>? ?? [];
    final sets = setsJson
        .map((row) => RoutineExerciseSet.fromJson(row as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.setNumber.compareTo(b.setNumber));
    return RoutineExercise(
      id: json['id'] as String,
      routineId: json['routine_id'] as String,
      orderIndex: json['order_index'] as int,
      exercise: Exercise.fromJson(json['exercises'] as Map<String, dynamic>),
      sets: sets,
      notes: json['notes'] as String?,
    );
  }
}

/// Una rutina junto con sus ejercicios (ya en orden) y las series de cada
/// uno. Es lo que necesita el constructor de rutinas para mostrarse
/// completo con una sola consulta.
class RoutineDetail {
  const RoutineDetail({required this.routine, required this.exercises});

  final Routine routine;
  final List<RoutineExercise> exercises;

  factory RoutineDetail.fromJson(Map<String, dynamic> json) {
    final exercisesJson = json['routine_exercises'] as List<dynamic>? ?? [];
    final exercises = exercisesJson
        .map((row) => RoutineExercise.fromJson(row as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return RoutineDetail(
      routine: Routine.fromJson(json),
      exercises: exercises,
    );
  }
}
