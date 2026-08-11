import '../../shared/models/client_goal.dart';

/// Plantilla de programa de varias semanas, hecha de rutinas ya
/// existentes asignadas a días específicos (ver [ProgramRoutine]). No
/// asigna clientes directamente: eso vive en `ClientAssignment`.
class Program {
  const Program({
    required this.id,
    required this.trainerId,
    required this.name,
    required this.durationWeeks,
    required this.createdAt,
    this.description,
    this.goal,
  });

  final String id;
  final String trainerId;
  final String name;
  final int durationWeeks;
  final DateTime createdAt;
  final String? description;
  final ClientGoal? goal;

  factory Program.fromJson(Map<String, dynamic> json) {
    return Program(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      name: json['name'] as String,
      durationWeeks: json['duration_weeks'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      goal: ClientGoal.fromRaw(json['goal'] as String?),
    );
  }
}
