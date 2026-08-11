import 'calendar_assignment.dart';
import 'calendar_session.dart';

/// Solo la fecha, sin hora — para poder comparar días sin que la hora de
/// creación del registro original meta ruido.
DateTime dateOnly(DateTime date) => DateTime(date.year, date.month, date.day);

/// El lunes de la semana ISO que contiene [date] (1 = lunes).
DateTime mondayOfWeek(DateTime date) {
  final d = dateOnly(date);
  return d.subtract(Duration(days: d.weekday - 1));
}

/// Calcula las sesiones concretas de una lista de asignaciones que caen
/// dentro de `[rangeStart, rangeEndInclusive]` (los dos incluidos).
///
/// - Programa: la semana 1 de la plantilla arranca el lunes de la semana
///   en la que cae `start_date` (así que puede incluir días de esa misma
///   semana anteriores a la fecha exacta de inicio — se interpreta como
///   "el programa arranca esa semana", no como un corte a la mitad de la
///   semana 1). Se repite por cada semana hasta `duration_weeks`. Si el
///   cliente tiene un ajuste puntual para ese día (`assignment_overrides`),
///   se muestra la rutina de reemplazo, no la de la plantilla.
/// - Rutina suelta: se repite semana a semana en el mismo día de la
///   semana que `start_date`, sin fecha de fin (hasta que el entrenador
///   la reemplace o el cliente termine).
List<CalendarSession> sessionsInRange(
  List<CalendarAssignment> assignments, {
  required DateTime rangeStart,
  required DateTime rangeEndInclusive,
}) {
  final start = dateOnly(rangeStart);
  final end = dateOnly(rangeEndInclusive);
  final sessions = <CalendarSession>[];

  for (final assignment in assignments) {
    if (assignment.isProgram) {
      final durationWeeks = assignment.programDurationWeeks ?? 0;
      final week1Start = mondayOfWeek(assignment.startDate);
      final programEndExclusive = week1Start.add(
        Duration(days: durationWeeks * 7),
      );

      for (final slot in assignment.slots) {
        final date = week1Start.add(
          Duration(days: (slot.weekNumber - 1) * 7 + (slot.dayOfWeek.raw - 1)),
        );
        if (date.isBefore(start) || date.isAfter(end)) continue;
        if (!date.isBefore(programEndExclusive)) continue;

        final override = assignment.overridesByProgramRoutineId[slot.programRoutineId];
        sessions.add(
          CalendarSession(
            date: date,
            assignmentId: assignment.assignmentId,
            clientId: assignment.clientId,
            clientName: assignment.clientName,
            routineName: override ?? slot.routineName,
            isProgram: true,
            programName: assignment.programName,
            isCustomizedForClient: override != null,
          ),
        );
      }
    } else {
      final routineName = assignment.standaloneRoutineName;
      if (routineName == null) continue;

      final assignmentStart = dateOnly(assignment.startDate);
      final weekday = assignmentStart.weekday;
      // Primera ocurrencia de ese día de la semana dentro del rango
      // pedido (puede caer antes de rangeStart si el rango arranca a
      // mitad de semana).
      var date = start.add(Duration(days: (weekday - start.weekday) % 7));
      while (!date.isAfter(end)) {
        if (!date.isBefore(assignmentStart)) {
          sessions.add(
            CalendarSession(
              date: date,
              assignmentId: assignment.assignmentId,
              clientId: assignment.clientId,
              clientName: assignment.clientName,
              routineName: routineName,
              isProgram: false,
            ),
          );
        }
        date = date.add(const Duration(days: 7));
      }
    }
  }

  sessions.sort((a, b) => a.date.compareTo(b.date));
  return sessions;
}

/// Agrupa sesiones ya calculadas por día, en un mapa ordenado por fecha
/// ascendente (útil para pintar la grilla del calendario).
Map<DateTime, List<CalendarSession>> groupSessionsByDate(
  List<CalendarSession> sessions,
) {
  final map = <DateTime, List<CalendarSession>>{};
  for (final session in sessions) {
    map.putIfAbsent(session.date, () => []).add(session);
  }
  return map;
}
