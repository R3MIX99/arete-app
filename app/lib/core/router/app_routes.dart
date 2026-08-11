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
  static const String trainerClientNew = '/trainer/clients/nuevo';
  static String trainerClientDetail(String id) => '/trainer/clients/$id';
  static String trainerClientEdit(String id) => '/trainer/clients/$id/editar';
  static const String trainerRoutines = '/trainer/routines';
  static const String trainerRoutineNew = '/trainer/routines/nueva';
  // No hay vista de solo lectura separada: abrir una rutina existente
  // lleva directo al mismo constructor que se usa para crearla.
  static String trainerRoutineDetail(String id) => '/trainer/routines/$id';
  static const String trainerExerciseLibrary = '/trainer/exercise-library';
  static const String trainerExerciseNew = '/trainer/exercise-library/nuevo';
  static String trainerExerciseEdit(String id) =>
      '/trainer/exercise-library/$id/editar';
  static const String trainerPrograms = '/trainer/programs';
  static const String trainerNutritionPlans = '/trainer/nutrition-plans';
  static const String trainerCalendar = '/trainer/calendar';
  static const String trainerProgress = '/trainer/progress';
  static const String trainerSettings = '/trainer/settings';

  // Panel de cliente.
  static const String clientHome = '/client';

  /// Enlace que el entrenador comparte con su cliente. Es accesible sin
  /// sesión iniciada: el cliente lo abre, crea su cuenta como prefiera
  /// (correo o Google) y el token lo vincula a ese entrenador.
  static const String invitationPattern = '/invitacion/:token';
  static String invitation(String token) => '/invitacion/$token';

  // Panel de superadministrador.
  static const String superadminHome = '/superadmin';
}
