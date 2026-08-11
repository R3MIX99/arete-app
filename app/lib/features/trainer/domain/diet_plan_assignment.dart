/// Un plan de alimentación asignado a un cliente concreto.
class DietPlanAssignment {
  const DietPlanAssignment({
    required this.id,
    required this.trainerId,
    required this.clientId,
    required this.dietPlanId,
    required this.startDate,
    required this.scaleFactor,
    this.targetDailyCalories,
  });

  final String id;
  final String trainerId;
  final String clientId;
  final String dietPlanId;
  final DateTime startDate;

  /// Objetivo calórico del cliente al momento de asignar, si difería del
  /// objetivo del plan.
  final double? targetDailyCalories;

  /// Factor por el que se multiplican las cantidades del plan al
  /// mostrárselas al cliente. 1 si coincide con el objetivo del plan o no
  /// se ajustó.
  final double scaleFactor;

  factory DietPlanAssignment.fromJson(Map<String, dynamic> json) {
    return DietPlanAssignment(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      clientId: json['client_id'] as String,
      dietPlanId: json['diet_plan_id'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      targetDailyCalories:
          (json['target_daily_calories'] as num?)?.toDouble(),
      scaleFactor: (json['scale_factor'] as num).toDouble(),
    );
  }
}

/// Una asignación con el nombre del cliente y del plan ya resueltos, para
/// mostrar en listados sin una consulta aparte.
class DietPlanAssignmentSummary {
  const DietPlanAssignmentSummary({
    required this.assignment,
    required this.clientName,
    required this.clientEmail,
    required this.planName,
  });

  final DietPlanAssignment assignment;
  final String clientName;
  final String clientEmail;
  final String planName;

  factory DietPlanAssignmentSummary.fromJson(Map<String, dynamic> json) {
    final client = json['profiles'] as Map<String, dynamic>?;
    final plan = json['diet_plans'] as Map<String, dynamic>?;
    final fullName = (client?['full_name'] as String? ?? '').trim();
    final email = client?['email'] as String? ?? '';
    return DietPlanAssignmentSummary(
      assignment: DietPlanAssignment.fromJson(json),
      clientName: fullName.isEmpty ? email : fullName,
      clientEmail: email,
      planName: plan?['name'] as String? ?? '',
    );
  }
}
