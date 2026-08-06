import 'user_role.dart';

/// Perfil de un usuario autenticado, reflejo de la fila correspondiente en
/// la tabla `profiles` de Supabase.
class Profile {
  const Profile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.createdAt,
    this.avatarUrl,
    this.trainerId,
  });

  final String id;
  final String fullName;
  final String email;
  final UserRole role;
  final DateTime createdAt;
  final String? avatarUrl;
  final String? trainerId;

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: UserRole.fromRaw(json['role'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
      avatarUrl: json['avatar_url'] as String?,
      trainerId: json['trainer_id'] as String?,
    );
  }
}
