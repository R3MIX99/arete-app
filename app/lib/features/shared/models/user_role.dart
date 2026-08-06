/// Los tres roles de la aplicación. Cada uno tiene su propio panel y su
/// propio conjunto de rutas (ver core/router/app_router.dart).
enum UserRole {
  superadmin,
  trainer,
  client;

  static UserRole fromRaw(String? raw) {
    switch (raw) {
      case 'superadmin':
        return UserRole.superadmin;
      case 'trainer':
        return UserRole.trainer;
      case 'client':
        return UserRole.client;
      default:
        // El rol por defecto más restrictivo mientras no se confirme el
        // rol real del usuario autenticado.
        return UserRole.client;
    }
  }

  /// Valor tal como se guarda en la base de datos (`profiles.role`).
  String get raw => name;

  /// Nombre visible en español (es-419).
  String get label {
    switch (this) {
      case UserRole.superadmin:
        return 'Superadministrador';
      case UserRole.trainer:
        return 'Entrenador';
      case UserRole.client:
        return 'Cliente';
    }
  }

  /// Roles que un usuario puede elegir al registrarse. El superadministrador
  /// se crea únicamente desde Supabase, nunca desde la app.
  static const List<UserRole> registrable = [UserRole.trainer, UserRole.client];
}
