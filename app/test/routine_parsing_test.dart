// El constructor de rutinas depende de que RoutineDetail.fromJson entienda
// exactamente la forma anidada que devuelve Supabase para
// `routines?select=*,routine_exercises(*,exercises(*),routine_exercise_sets(*))`.
// Este fixture es una respuesta real, capturada al verificar el módulo
// contra el proyecto de Supabase.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/domain/routine_exercise.dart';

void main() {
  test('RoutineDetail.fromJson arma la rutina, sus ejercicios en orden y sus series', () {
    final json = {
      'id': 'adc16886-732d-42b4-89cf-c4d2c2f859a1',
      'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
      'name': 'Rutina de prueba - Piernas y pecho',
      'description': 'Rutina de verificacion end-to-end',
      'goal': 'gain_muscle',
      'level': 'intermediate',
      'created_at': '2026-08-11T17:35:50.717674+00:00',
      'ai_score': null,
      'ai_score_summary': null,
      'ai_analyzed_at': null,
      'routine_exercises': [
        // A propósito en el orden contrario al que deben quedar, para
        // confirmar que fromJson ordena por order_index y no confía en el
        // orden en que llega el arreglo.
        {
          'id': 'c786cdf4-328b-4a01-88b5-f0a9cca9bb80',
          'notes': null,
          'exercises': {
            'id': 'f0b7c5bf-df80-426e-9750-fd9e1e3731a7',
            'name': 'Press de banca',
            'equipment': 'barbell',
            'video_url': null,
            'created_at': '2026-08-11T17:34:58.333599+00:00',
            'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
            'description': null,
            'muscle_group': 'chest',
          },
          'created_at': '2026-08-11T17:35:53.563759+00:00',
          'routine_id': 'adc16886-732d-42b4-89cf-c4d2c2f859a1',
          'exercise_id': 'f0b7c5bf-df80-426e-9750-fd9e1e3731a7',
          'order_index': 1,
          'routine_exercise_sets': [
            {
              'id': 'c4f19431-87d2-4dbd-a6cc-971a2ed0afc1',
              'set_number': 1,
              'rest_seconds': 90,
              'target_reps_max': 12,
              'target_reps_min': 8,
              'suggested_weight': null,
              'routine_exercise_id': 'c786cdf4-328b-4a01-88b5-f0a9cca9bb80',
            },
          ],
        },
        {
          'id': '01c90ee2-714e-49d2-9e4b-04f0def13e32',
          'notes': 'Calentar antes',
          'exercises': {
            'id': '2f0f965c-d100-4351-aa12-99b04569dcb9',
            'name': 'Sentadilla con barra',
            'equipment': 'barbell',
            'video_url': 'https://www.youtube.com/watch?v=SW_C1A-rejs',
            'created_at': '2026-08-11T17:34:57.500896+00:00',
            'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
            'description': 'Sentadilla trasera clasica',
            'muscle_group': 'legs',
          },
          'created_at': '2026-08-11T17:35:51.609129+00:00',
          'routine_id': 'adc16886-732d-42b4-89cf-c4d2c2f859a1',
          'exercise_id': '2f0f965c-d100-4351-aa12-99b04569dcb9',
          'order_index': 0,
          // También al revés, para confirmar que las series se ordenan
          // por set_number.
          'routine_exercise_sets': [
            {
              'id': 'ba3d5e43-579b-4802-9651-407fd63ac85b',
              'set_number': 3,
              'rest_seconds': 120,
              'target_reps_max': 6,
              'target_reps_min': 4,
              'suggested_weight': 80,
              'routine_exercise_id': '01c90ee2-714e-49d2-9e4b-04f0def13e32',
            },
            {
              'id': '81129efd-3c92-4689-b1ec-c4ba221e8520',
              'set_number': 1,
              'rest_seconds': 60,
              'target_reps_max': 15,
              'target_reps_min': 12,
              'suggested_weight': 40,
              'routine_exercise_id': '01c90ee2-714e-49d2-9e4b-04f0def13e32',
            },
            {
              'id': '7114002d-14c4-430e-8458-fec2b406422c',
              'set_number': 2,
              'rest_seconds': 90,
              'target_reps_max': 10,
              'target_reps_min': 8,
              'suggested_weight': 60,
              'routine_exercise_id': '01c90ee2-714e-49d2-9e4b-04f0def13e32',
            },
          ],
        },
      ],
    };

    final detail = RoutineDetail.fromJson(json);

    expect(detail.routine.name, 'Rutina de prueba - Piernas y pecho');
    expect(detail.exercises, hasLength(2));

    // Ordenados por order_index: sentadilla (0) antes que press (1).
    expect(detail.exercises[0].exercise.name, 'Sentadilla con barra');
    expect(detail.exercises[1].exercise.name, 'Press de banca');

    final squatSets = detail.exercises[0].sets;
    expect(squatSets, hasLength(3));
    // Ordenadas por set_number: el esquema piramidal queda en orden.
    expect(squatSets.map((s) => s.setNumber).toList(), [1, 2, 3]);
    expect(squatSets[0].repsRangeLabel, '12-15');
    expect(squatSets[0].suggestedWeight, 40);
    expect(squatSets[2].repsRangeLabel, '4-6');
    expect(squatSets[2].suggestedWeight, 80);

    final benchSets = detail.exercises[1].sets;
    expect(benchSets, hasLength(1));
    expect(benchSets[0].suggestedWeight, isNull);
  });
}
