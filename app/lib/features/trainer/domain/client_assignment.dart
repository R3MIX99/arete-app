/// Un programa o una rutina suelta asignados a un cliente concreto, con
/// fecha de inicio. Nunca tiene [programId] y [routineId] a la vez (la
/// base de datos también lo exige con un constraint): es una cosa o la
/// otra.
class ClientAssignment {
  const ClientAssignment({
    required this.id,
    required this.trainerId,
    required this.clientId,
    required this.startDate,
    required this.createdAt,
    this.programId,
    this.routineId,
  });

  final String id;
  final String trainerId;
  final String clientId;
  final DateTime startDate;
  final DateTime createdAt;
  final String? programId;
  final String? routineId;

  bool get isProgram => programId != null;

  factory ClientAssignment.fromJson(Map<String, dynamic> json) {
    return ClientAssignment(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      clientId: json['client_id'] as String,
      startDate: DateTime.parse(json['start_date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      programId: json['program_id'] as String?,
      routineId: json['routine_id'] as String?,
    );
  }
}

/// Una asignación junto con los nombres que hacen falta para mostrarla en
/// una lista (quién es el cliente, qué se le asignó), sin cargar el
/// programa o rutina completos.
class AssignmentSummary {
  const AssignmentSummary({
    required this.assignment,
    required this.clientName,
    required this.itemName,
  });

  final ClientAssignment assignment;
  final String clientName;

  /// Nombre del programa o de la rutina asignada, según corresponda.
  final String itemName;

  factory AssignmentSummary.fromJson(Map<String, dynamic> json) {
    final client = json['profiles'] as Map<String, dynamic>?;
    final program = json['programs'] as Map<String, dynamic>?;
    final routine = json['routines'] as Map<String, dynamic>?;
    return AssignmentSummary(
      assignment: ClientAssignment.fromJson(json),
      clientName: (client?['full_name'] as String?)?.trim().isNotEmpty == true
          ? client!['full_name'] as String
          : (client?['email'] as String? ?? ''),
      itemName: (program?['name'] as String?) ?? (routine?['name'] as String?) ?? '',
    );
  }
}
