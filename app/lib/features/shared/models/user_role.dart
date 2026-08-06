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
}
