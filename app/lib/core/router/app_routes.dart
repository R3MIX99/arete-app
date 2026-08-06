/// Nombres y rutas centralizados. Evita rutas escritas a mano y repetidas
/// en distintos archivos.
class AppRoutes {
  const AppRoutes._();

  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';

  // Panel de entrenador. trainerHome apunta directo al módulo de Dashboard;
  // los demás módulos son ramas del mismo shell de navegación (ver
  // core/router/app_router.dart).
  static const String trainerHome = '/trainer/dashboard';
  static const String trainerClients = '/trainer/clients';
  static const String trainerRoutines = '/trainer/routines';
  static const String trainerExerciseLibrary = '/trainer/exercise-library';
  static const String trainerPrograms = '/trainer/programs';
  static const String trainerNutritionPlans = '/trainer/nutrition-plans';
  static const String trainerCalendar = '/trainer/calendar';
  static const String trainerProgress = '/trainer/progress';
  static const String trainerSettings = '/trainer/settings';

  // Panel de cliente.
  static const String clientHome = '/client';

  // Panel de superadministrador.
  static const String superadminHome = '/superadmin';
}
