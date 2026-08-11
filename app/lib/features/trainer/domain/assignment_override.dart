import 'routine.dart';

/// Reemplazo de la rutina de un día puntual del programa, solo para una
/// asignación (un cliente) en particular. La plantilla original en
/// `program_routines` no cambia: cualquier otro cliente con el mismo
/// programa sigue viendo la rutina original.
class AssignmentOverride {
  const AssignmentOverride({
    required this.id,
    required this.assignmentId,
    required this.programRoutineId,
    required this.routine,
    required this.createdAt,
  });

  final String id;
  final String assignmentId;
  final String programRoutineId;
  final Routine routine;
  final DateTime createdAt;

  factory AssignmentOverride.fromJson(Map<String, dynamic> json) {
    return AssignmentOverride(
      id: json['id'] as String,
      assignmentId: json['assignment_id'] as String,
      programRoutineId: json['program_routine_id'] as String,
      routine: Routine.fromJson(json['routines'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
