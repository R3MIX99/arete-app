// La lógica que convierte "un programa asignado" o "una rutina suelta
// asignada" en fechas concretas del calendario es pura y fácil de romper
// sin darse cuenta (offsets de semana, día ISO, ajustes puntuales). Estas
// pruebas fijan ese comportamiento.

import 'package:flutter_test/flutter_test.dart';

import 'package:arete/features/trainer/domain/calendar_assignment.dart';
import 'package:arete/features/trainer/domain/calendar_logic.dart';
import 'package:arete/features/trainer/domain/weekday.dart';

void main() {
  group('mondayOfWeek', () {
    test('un miércoles retrocede al lunes de esa semana', () {
      // 2026-08-12 es miércoles.
      expect(mondayOfWeek(DateTime(2026, 8, 12)), DateTime(2026, 8, 10));
    });

    test('un lunes se queda igual', () {
      expect(mondayOfWeek(DateTime(2026, 8, 10)), DateTime(2026, 8, 10));
    });
  });

  group('sessionsInRange — programa', () {
    final assignment = CalendarAssignment(
      assignmentId: 'a1',
      clientId: 'c1',
      clientName: 'Cliente Uno',
      // Lunes 2026-08-10, semana 1 del programa arranca ese mismo lunes.
      startDate: DateTime(2026, 8, 10),
      isProgram: true,
      programName: 'Programa X',
      programDurationWeeks: 2,
      slots: const [
        CalendarProgramSlot(
          programRoutineId: 'pr1',
          weekNumber: 1,
          dayOfWeek: Weekday.monday,
          routineName: 'Piernas',
        ),
        CalendarProgramSlot(
          programRoutineId: 'pr2',
          weekNumber: 2,
          dayOfWeek: Weekday.wednesday,
          routineName: 'Espalda',
        ),
      ],
    );

    test('ubica cada slot en la fecha correcta de su semana', () {
      final sessions = sessionsInRange(
        [assignment],
        rangeStart: DateTime(2026, 8, 1),
        rangeEndInclusive: DateTime(2026, 8, 31),
      );

      expect(sessions, hasLength(2));
      expect(sessions[0].date, DateTime(2026, 8, 10)); // semana 1, lunes
      expect(sessions[0].routineName, 'Piernas');
      expect(sessions[1].date, DateTime(2026, 8, 19)); // semana 2, miércoles
      expect(sessions[1].routineName, 'Espalda');
    });

    test('no genera sesiones más allá de duration_weeks', () {
      final beyond = assignment.slots.first;
      final threeWeekSlot = CalendarProgramSlot(
        programRoutineId: 'pr3',
        weekNumber: 3, // el programa solo dura 2 semanas
        dayOfWeek: beyond.dayOfWeek,
        routineName: 'No debería aparecer',
      );
      final withExtra = CalendarAssignment(
        assignmentId: assignment.assignmentId,
        clientId: assignment.clientId,
        clientName: assignment.clientName,
        startDate: assignment.startDate,
        isProgram: true,
        programDurationWeeks: 2,
        slots: [...assignment.slots, threeWeekSlot],
      );

      final sessions = sessionsInRange(
        [withExtra],
        rangeStart: DateTime(2026, 8, 1),
        rangeEndInclusive: DateTime(2026, 9, 30),
      );

      expect(
        sessions.any((s) => s.routineName == 'No debería aparecer'),
        isFalse,
      );
    });

    test('respeta el rango pedido, sin traer sesiones de fuera', () {
      final sessions = sessionsInRange(
        [assignment],
        rangeStart: DateTime(2026, 8, 10),
        rangeEndInclusive: DateTime(2026, 8, 10),
      );
      expect(sessions, hasLength(1));
      expect(sessions.single.date, DateTime(2026, 8, 10));
    });

    test('un ajuste puntual reemplaza la rutina de la plantilla', () {
      final withOverride = CalendarAssignment(
        assignmentId: assignment.assignmentId,
        clientId: assignment.clientId,
        clientName: assignment.clientName,
        startDate: assignment.startDate,
        isProgram: true,
        programDurationWeeks: 2,
        slots: assignment.slots,
        overridesByProgramRoutineId: const {'pr1': 'Cardio (ajustado)'},
      );

      final sessions = sessionsInRange(
        [withOverride],
        rangeStart: DateTime(2026, 8, 1),
        rangeEndInclusive: DateTime(2026, 8, 31),
      );

      final adjusted = sessions.firstWhere((s) => s.date == DateTime(2026, 8, 10));
      expect(adjusted.routineName, 'Cardio (ajustado)');
      expect(adjusted.isCustomizedForClient, isTrue);

      final untouched = sessions.firstWhere((s) => s.date == DateTime(2026, 8, 19));
      expect(untouched.routineName, 'Espalda');
      expect(untouched.isCustomizedForClient, isFalse);
    });
  });

  group('sessionsInRange — rutina suelta', () {
    final assignment = CalendarAssignment(
      assignmentId: 'a2',
      clientId: 'c2',
      clientName: 'Cliente Dos',
      startDate: DateTime(2026, 8, 12), // miércoles
      isProgram: false,
      standaloneRoutineName: 'Cardio semanal',
    );

    test('se repite cada semana en el mismo día', () {
      final sessions = sessionsInRange(
        [assignment],
        rangeStart: DateTime(2026, 8, 1),
        rangeEndInclusive: DateTime(2026, 8, 31),
      );

      final dates = sessions.map((s) => s.date).toList();
      expect(dates, [
        DateTime(2026, 8, 12),
        DateTime(2026, 8, 19),
        DateTime(2026, 8, 26),
      ]);
    });

    test('no aparece antes de la fecha de inicio', () {
      final sessions = sessionsInRange(
        [assignment],
        rangeStart: DateTime(2026, 8, 1),
        rangeEndInclusive: DateTime(2026, 8, 31),
      );
      expect(sessions.every((s) => !s.date.isBefore(DateTime(2026, 8, 12))), isTrue);
    });
  });

  group('groupSessionsByDate', () {
    test('agrupa varias sesiones del mismo día, de distintos clientes', () {
      final programAssignment = CalendarAssignment(
        assignmentId: 'a1',
        clientId: 'c1',
        clientName: 'Cliente Uno',
        startDate: DateTime(2026, 8, 10),
        isProgram: true,
        programDurationWeeks: 1,
        slots: const [
          CalendarProgramSlot(
            programRoutineId: 'pr1',
            weekNumber: 1,
            dayOfWeek: Weekday.monday,
            routineName: 'Piernas',
          ),
        ],
      );
      final routineAssignment = CalendarAssignment(
        assignmentId: 'a2',
        clientId: 'c2',
        clientName: 'Cliente Dos',
        startDate: DateTime(2026, 8, 10),
        isProgram: false,
        standaloneRoutineName: 'Cardio',
      );

      final sessions = sessionsInRange(
        [programAssignment, routineAssignment],
        rangeStart: DateTime(2026, 8, 10),
        rangeEndInclusive: DateTime(2026, 8, 10),
      );
      final grouped = groupSessionsByDate(sessions);

      expect(grouped, hasLength(1));
      expect(grouped[DateTime(2026, 8, 10)], hasLength(2));
    });
  });
}
