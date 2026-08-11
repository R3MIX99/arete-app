import 'program.dart';
import 'routine.dart';
import 'weekday.dart';

/// Una rutina de la biblioteca ubicada en un día y semana específicos
/// dentro de un programa. [routine] viaja junto (join) para mostrar su
/// nombre sin una consulta aparte.
class ProgramRoutine {
  const ProgramRoutine({
    required this.id,
    required this.programId,
    required this.weekNumber,
    required this.dayOfWeek,
    required this.routine,
    this.notes,
  });

  final String id;
  final String programId;
  final int weekNumber;
  final Weekday dayOfWeek;
  final Routine routine;
  final String? notes;

  factory ProgramRoutine.fromJson(Map<String, dynamic> json) {
    return ProgramRoutine(
      id: json['id'] as String,
      programId: json['program_id'] as String,
      weekNumber: json['week_number'] as int,
      dayOfWeek: Weekday.fromRaw(json['day_of_week'] as int),
      routine: Routine.fromJson(json['routines'] as Map<String, dynamic>),
      notes: json['notes'] as String?,
    );
  }
}

/// Un programa junto con todas sus rutinas ya ubicadas por semana y día.
class ProgramDetail {
  const ProgramDetail({required this.program, required this.routines});

  final Program program;
  final List<ProgramRoutine> routines;

  factory ProgramDetail.fromJson(Map<String, dynamic> json) {
    final routinesJson = json['program_routines'] as List<dynamic>? ?? [];
    final routines = routinesJson
        .map((row) => ProgramRoutine.fromJson(row as Map<String, dynamic>))
        .toList()
      ..sort((a, b) {
        final byWeek = a.weekNumber.compareTo(b.weekNumber);
        if (byWeek != 0) return byWeek;
        return a.dayOfWeek.raw.compareTo(b.dayOfWeek.raw);
      });
    return ProgramDetail(program: Program.fromJson(json), routines: routines);
  }

  /// Las rutinas de una semana puntual, ya en orden por día.
  List<ProgramRoutine> routinesForWeek(int weekNumber) {
    return routines.where((r) => r.weekNumber == weekNumber).toList();
  }
}
