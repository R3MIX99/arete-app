/// Nombres y rutas centralizados. Evita rutas escritas a mano y repetidas
/// en distintos archivos.
class AppRoutes {
  const AppRoutes._();

  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';

  // Panel de entrenador.
  static const String trainerHome = '/trainer';

  // Panel de cliente.
  static const String clientHome = '/client';

  // Panel de superadministrador.
  static const String superadminHome = '/superadmin';
}
