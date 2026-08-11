import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';

/// Un módulo del panel de entrenador: ícono, nombre visible y ruta.
///
/// Se usa el mismo ícono en estado seleccionado y no seleccionado (un solo
/// estilo de ícono por nivel de jerarquía); la selección se distingue por
/// color e indicador, no mezclando íconos delineados y rellenos.
class TrainerNavItem {
  const TrainerNavItem({
    required this.label,
    required this.icon,
    required this.path,
  });

  final String label;

  /// Ruta SVG del ícono (ver [AppIconPaths]); se dibuja con `AppIcon`.
  final String icon;
  final String path;

  /// Los 9 módulos del panel de entrenador, en el orden en que deben
  /// aparecer en la navegación.
  static const List<TrainerNavItem> all = [
    TrainerNavItem(
      label: 'Dashboard',
      icon: AppIconPaths.dashboard,
      path: AppRoutes.trainerHome,
    ),
    TrainerNavItem(
      label: 'Clientes',
      icon: AppIconPaths.group,
      path: AppRoutes.trainerClients,
    ),
    TrainerNavItem(
      label: 'Rutinas',
      icon: AppIconPaths.fitnessCenter,
      path: AppRoutes.trainerRoutines,
    ),
    TrainerNavItem(
      label: 'Biblioteca de ejercicios',
      icon: AppIconPaths.videoLibrary,
      path: AppRoutes.trainerExerciseLibrary,
    ),
    TrainerNavItem(
      label: 'Programas',
      icon: AppIconPaths.calendarViewMonth,
      path: AppRoutes.trainerPrograms,
    ),
    TrainerNavItem(
      label: 'Planes nutricionales',
      icon: AppIconPaths.nutrition,
      path: AppRoutes.trainerNutritionPlans,
    ),
    TrainerNavItem(
      label: 'Calendario',
      icon: AppIconPaths.calendarMonth,
      path: AppRoutes.trainerCalendar,
    ),
    TrainerNavItem(
      label: 'Seguimiento de progreso',
      icon: AppIconPaths.monitoring,
      path: AppRoutes.trainerProgress,
    ),
    TrainerNavItem(
      label: 'Configuración',
      icon: AppIconPaths.settings,
      path: AppRoutes.trainerSettings,
    ),
  ];
}
