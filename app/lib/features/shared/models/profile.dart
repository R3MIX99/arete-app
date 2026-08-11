import 'client_goal.dart';
import 'user_role.dart';

/// Perfil de un usuario autenticado, reflejo de la fila correspondiente en
/// la tabla `profiles` de Supabase.
///
/// Un cliente es un perfil con `role == UserRole.client` y `trainerId`
/// apuntando a su entrenador; por eso los campos de cliente ([goal],
/// [healthNotes], [status]) viven aquí y no en un modelo aparte: es la
/// misma fila, no habría dos fuentes de verdad.
class Profile {
  const Profile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.createdAt,
    required this.status,
    this.avatarUrl,
    this.trainerId,
    this.goal,
    this.healthNotes,
    this.phone,
    this.businessName,
    this.notifyEmail = true,
    this.notifyPush = true,
    this.subscriptionPlan = 'free',
    this.subscriptionStatus = 'active',
  });

  final String id;
  final String fullName;
  final String email;
  final UserRole role;
  final DateTime createdAt;
  final ClientStatus status;
  final String? avatarUrl;
  final String? trainerId;

  /// Objetivo principal. Solo aplica cuando [role] es cliente.
  final ClientGoal? goal;

  /// Restricciones alimentarias o de salud relevantes para armar rutina y
  /// dieta. Solo aplica cuando [role] es cliente.
  final String? healthNotes;
  final String? phone;

  /// Nombre del gimnasio o marca personal. Solo aplica a entrenadores.
  final String? businessName;
  final bool notifyEmail;
  final bool notifyPush;

  /// Solo visualización por ahora (Fase 6); la lógica de pago real se
  /// conecta en la Fase 15.
  final String subscriptionPlan;
  final String subscriptionStatus;

  bool get isActive => status == ClientStatus.active;

  /// Nombre a mostrar. Un cliente invitado que aún no completó su registro
  /// puede no tener nombre todavía; en ese caso se cae al correo para no
  /// mostrar una fila en blanco.
  String get displayName => fullName.trim().isEmpty ? email : fullName.trim();

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: UserRole.fromRaw(json['role'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
      status: ClientStatus.fromRaw(json['status'] as String?),
      avatarUrl: json['avatar_url'] as String?,
      trainerId: json['trainer_id'] as String?,
      goal: ClientGoal.fromRaw(json['goal'] as String?),
      healthNotes: json['health_notes'] as String?,
      phone: json['phone'] as String?,
      businessName: json['business_name'] as String?,
      notifyEmail: json['notify_email'] as bool? ?? true,
      notifyPush: json['notify_push'] as bool? ?? true,
      subscriptionPlan: json['subscription_plan'] as String? ?? 'free',
      subscriptionStatus: json['subscription_status'] as String? ?? 'active',
    );
  }
}
