// El constructor de programas depende de que ProgramDetail.fromJson
// entienda exactamente la forma anidada que devuelve Supabase para
// `programs?select=*,program_routines(*,routines(*))`. Este fixture es
// una respuesta real, capturada al verificar el módulo contra el
// proyecto de Supabase.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/domain/program_routine.dart';
import 'package:arete/features/trainer/domain/weekday.dart';

void main() {
  test(
    'ProgramDetail.fromJson arma el programa y ordena sus rutinas por semana y día',
    () {
      final json = {
        'id': '53cf2c92-95b5-4d2e-b492-38ed0986022b',
        'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
        'name': 'Programa de prueba - 4 semanas',
        'description': 'Verificacion end-to-end de la Fase 7',
        'duration_weeks': 4,
        'goal': 'gain_muscle',
        'created_at': '2026-08-11T21:57:32.105752+00:00',
        'program_routines': [
          // A propósito fuera de orden, para confirmar que fromJson
          // ordena por semana y luego por día, no confía en el arreglo.
          {
            'id': 'pr-sem3-lun',
            'program_id': '53cf2c92-95b5-4d2e-b492-38ed0986022b',
            'routine_id': 'routine-1',
            'week_number': 3,
            'day_of_week': 1,
            'notes': null,
            'created_at': '2026-08-11T21:57:50Z',
            'routines': {
              'id': 'routine-1',
              'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
              'name': 'Rutina de prueba - Piernas y pecho',
              'description': null,
              'goal': 'gain_muscle',
              'level': 'intermediate',
              'created_at': '2026-08-11T17:35:50Z',
              'ai_score': null,
              'ai_score_summary': null,
              'ai_analyzed_at': null,
            },
          },
          {
            'id': 'pr-sem1-mie',
            'program_id': '53cf2c92-95b5-4d2e-b492-38ed0986022b',
            'routine_id': 'routine-2',
            'week_number': 1,
            'day_of_week': 3,
            'notes': null,
            'created_at': '2026-08-11T21:57:45Z',
            'routines': {
              'id': 'routine-2',
              'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
              'name': 'Cardio ligero',
              'description': null,
              'goal': null,
              'level': 'beginner',
              'created_at': '2026-08-11T21:57:40Z',
              'ai_score': null,
              'ai_score_summary': null,
              'ai_analyzed_at': null,
            },
          },
          {
            'id': 'pr-sem1-lun',
            'program_id': '53cf2c92-95b5-4d2e-b492-38ed0986022b',
            'routine_id': 'routine-1',
            'week_number': 1,
            'day_of_week': 1,
            'notes': null,
            'created_at': '2026-08-11T21:57:42Z',
            'routines': {
              'id': 'routine-1',
              'trainer_id': '0f2d5347-ecaf-46c9-967f-6be579272774',
              'name': 'Rutina de prueba - Piernas y pecho',
              'description': null,
              'goal': 'gain_muscle',
              'level': 'intermediate',
              'created_at': '2026-08-11T17:35:50Z',
              'ai_score': null,
              'ai_score_summary': null,
              'ai_analyzed_at': null,
            },
          },
        ],
      };

      final detail = ProgramDetail.fromJson(json);

      expect(detail.program.name, 'Programa de prueba - 4 semanas');
      expect(detail.program.durationWeeks, 4);
      expect(detail.routines, hasLength(3));

      // Ordenadas: semana 1 (lunes, luego miércoles) antes que semana 3.
      expect(detail.routines[0].weekNumber, 1);
      expect(detail.routines[0].dayOfWeek, Weekday.monday);
      expect(detail.routines[1].weekNumber, 1);
      expect(detail.routines[1].dayOfWeek, Weekday.wednesday);
      expect(detail.routines[2].weekNumber, 3);
      expect(detail.routines[2].dayOfWeek, Weekday.monday);

      final week1 = detail.routinesForWeek(1);
      expect(week1, hasLength(2));
      expect(week1.map((r) => r.routine.name), [
        'Rutina de prueba - Piernas y pecho',
        'Cardio ligero',
      ]);

      final week3 = detail.routinesForWeek(3);
      expect(week3, hasLength(1));
      expect(week3.single.routine.name, 'Rutina de prueba - Piernas y pecho');
    },
  );
}
