import 'weekday.dart';

/// Una rutina ubicada en semana/día dentro de un programa asignado, tal
/// como viene de `program_routines`. Vive acá (y no en `program_routine.dart`)
/// porque el calendario solo necesita lo mínimo para calcular fechas, no
/// el detalle completo del programa.
class CalendarProgramSlot {
  const CalendarProgramSlot({
    required this.programRoutineId,
    required this.weekNumber,
    required this.dayOfWeek,
    required this.routineName,
  });

  final String programRoutineId;
  final int weekNumber;
  final Weekday dayOfWeek;
  final String routineName;
}

/// Una asignación (programa o rutina suelta) de un cliente, con lo
/// mínimo necesario para calcular en qué fechas concretas caen sus
/// sesiones. Es la entrada de `sessionsInRange` (ver `calendar_logic.dart`).
class CalendarAssignment {
  const CalendarAssignment({
    required this.assignmentId,
    required this.clientId,
    required this.clientName,
    required this.startDate,
    required this.isProgram,
    this.programName,
    this.programDurationWeeks,
    this.standaloneRoutineName,
    this.slots = const [],
    this.overridesByProgramRoutineId = const {},
  });

  final String assignmentId;
  final String clientId;
  final String clientName;
  final DateTime startDate;
  final bool isProgram;

  final String? programName;
  final int? programDurationWeeks;

  /// Solo cuando `!isProgram`: el nombre de la rutina suelta asignada.
  final String? standaloneRoutineName;

  /// Solo cuando `isProgram`: dónde va cada rutina del programa.
  final List<CalendarProgramSlot> slots;

  /// `program_routine_id` → nombre de la rutina de reemplazo, para los
  /// días que este cliente en particular tiene ajustados (ver
  /// `assignment_overrides`), sin tocar la plantilla del programa.
  final Map<String, String> overridesByProgramRoutineId;

  factory CalendarAssignment.fromJson(Map<String, dynamic> json) {
    final client = json['profiles'] as Map<String, dynamic>?;
    final fullName = (client?['full_name'] as String? ?? '').trim();
    final email = client?['email'] as String? ?? '';
    final clientName = fullName.isEmpty ? email : fullName;

    final program = json['programs'] as Map<String, dynamic>?;
    final routine = json['routines'] as Map<String, dynamic>?;

    final overridesJson =
        json['assignment_overrides'] as List<dynamic>? ?? [];
    final overrides = <String, String>{
      for (final row in overridesJson)
        (row as Map<String, dynamic>)['program_routine_id'] as String:
            (row['routines'] as Map<String, dynamic>?)?['name'] as String? ??
                '',
    };

    final slotsJson = program?['program_routines'] as List<dynamic>? ?? [];
    final slots = slotsJson
        .map((row) {
          final r = row as Map<String, dynamic>;
          return CalendarProgramSlot(
            programRoutineId: r['id'] as String,
            weekNumber: r['week_number'] as int,
            dayOfWeek: Weekday.fromRaw(r['day_of_week'] as int),
            routineName:
                (r['routines'] as Map<String, dynamic>?)?['name'] as String? ??
                    '',
          );
        })
        .toList();

    return CalendarAssignment(
      assignmentId: json['id'] as String,
      clientId: json['client_id'] as String,
      clientName: clientName,
      startDate: DateTime.parse(json['start_date'] as String),
      isProgram: program != null,
      programName: program?['name'] as String?,
      programDurationWeeks: program?['duration_weeks'] as int?,
      standaloneRoutineName: routine?['name'] as String?,
      slots: slots,
      overridesByProgramRoutineId: overrides,
    );
  }
}
