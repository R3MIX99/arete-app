import '../../shared/models/client_goal.dart';

/// Estado de una invitación, reflejo de la columna `status` de
/// `client_invitations`.
enum InvitationStatus {
  pending('pending', 'Pendiente'),
  accepted('accepted', 'Aceptada'),
  expired('expired', 'Vencida'),
  cancelled('cancelled', 'Cancelada');

  const InvitationStatus(this.raw, this.label);

  final String raw;
  final String label;

  static InvitationStatus fromRaw(String? raw) {
    for (final status in InvitationStatus.values) {
      if (status.raw == raw) return status;
    }
    return InvitationStatus.pending;
  }
}

/// Invitación que un entrenador genera para sumar a un cliente.
///
/// El cliente crea su propia cuenta (por correo o por Google) y el [token]
/// del enlace lo vincula automáticamente a este entrenador, con los datos
/// que el entrenador ya cargó aquí.
class ClientInvitation {
  const ClientInvitation({
    required this.id,
    required this.trainerId,
    required this.email,
    required this.status,
    required this.token,
    required this.createdAt,
    this.fullName,
    this.goal,
    this.healthNotes,
    this.acceptedAt,
  });

  final String id;
  final String trainerId;
  final String email;
  final InvitationStatus status;
  final String token;
  final DateTime createdAt;
  final String? fullName;
  final ClientGoal? goal;
  final String? healthNotes;
  final DateTime? acceptedAt;

  bool get isPending => status == InvitationStatus.pending;

  String get displayName =>
      (fullName?.trim().isNotEmpty ?? false) ? fullName!.trim() : email;

  factory ClientInvitation.fromJson(Map<String, dynamic> json) {
    return ClientInvitation(
      id: json['id'] as String,
      trainerId: json['trainer_id'] as String,
      email: json['email'] as String? ?? '',
      status: InvitationStatus.fromRaw(json['status'] as String?),
      token: json['token'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      fullName: json['full_name'] as String?,
      goal: ClientGoal.fromRaw(json['goal'] as String?),
      healthNotes: json['health_notes'] as String?,
      acceptedAt: json['accepted_at'] == null
          ? null
          : DateTime.parse(json['accepted_at'] as String),
    );
  }
}
