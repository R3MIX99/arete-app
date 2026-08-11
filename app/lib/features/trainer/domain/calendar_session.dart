/// Una sesión concreta en una fecha: qué cliente, qué rutina, calculada a
/// partir de una [CalendarAssignment] (ver `calendar_logic.dart`).
class CalendarSession {
  const CalendarSession({
    required this.date,
    required this.assignmentId,
    required this.clientId,
    required this.clientName,
    required this.routineName,
    required this.isProgram,
    this.programName,
    this.isCustomizedForClient = false,
  });

  /// Solo la fecha (sin hora).
  final DateTime date;
  final String assignmentId;
  final String clientId;
  final String clientName;
  final String routineName;
  final bool isProgram;
  final String? programName;

  /// `true` cuando esta rutina reemplaza, solo para este cliente, la que
  /// indica la plantilla del programa (ver `assignment_overrides`).
  final bool isCustomizedForClient;
}
