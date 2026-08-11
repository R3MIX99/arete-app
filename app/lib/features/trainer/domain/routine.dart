import '../../shared/models/client_goal.dart';

/// Nivel de dificultad de una rutina.
enum RoutineLevel {
  beginner('beginner', 'Principiante'),
  intermediate('intermediate', 'Intermedio'),
  advanced('advanced', 'Avanzado');

  const RoutineLevel(this.raw, this.label);

  final String raw;
  final String label;

  static RoutineLevel fromRaw(String? raw) {
    for (final level in RoutineLevel.values) {
      if (level.raw == raw) return level;
    }
    return RoutineLevel.beginner;
  }
}

/// Plantilla de rutina de entrenamiento. Los ejercicios y series que la
/// componen se manejan aparte (ver [RoutineExercise]).
class Routine {
  const Routine({
    required this.id,
    required this.trainerId,
    required this.name,
    required this.level,
    required this.createdAt,
    this.description,
    this.goal,
    this.aiScore,
    this.aiScoreSummary,
    this.aiAnalyzedAt,
  });

  final String id;
  final String trainerId;
  final String name;
  final RoutineLevel level;
  final DateTime createdAt;
  final String? description;
  final ClientGoal? goal;

  /// Puntaje del análisis de IA. Columna preparada desde esta fase; el
  /// análisis que la llena se construye en la Fase 8. Hasta entonces
  /// siempre llega `null`.
  final double? aiScore;
  final String? aiScoreSummary;
  final DateTime? aiAnalyzedAt;

  factory Routine.fromJson(Map<String, dynamic> json) {
    return Routine(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      name: json['name'] as String,
      level: RoutineLevel.fromRaw(json['level'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      goal: ClientGoal.fromRaw(json['goal'] as String?),
      aiScore: (json['ai_score'] as num?)?.toDouble(),
      aiScoreSummary: json['ai_score_summary'] as String?,
      aiAnalyzedAt: json['ai_analyzed_at'] == null
          ? null
          : DateTime.parse(json['ai_analyzed_at'] as String),
    );
  }
}
