import 'package:flutter/material.dart';

import '../../../../core/router/app_routes.dart';

/// Un módulo del panel de entrenador: ícono, nombre visible y ruta.
///
/// Se usa el mismo ícono en estado seleccionado y no seleccionado (un solo
/// estilo de ícono por nivel de jerarquía); la selección se distingue por
/// color e indicador, no mezclando íconos delineados y rellenos.
///
/// Los íconos usan la clase `Icons` incluida en el SDK de Flutter, no el
/// paquete `material_symbols_icons`: varios íconos de ese paquete
/// (dashboard, fitness_center, video_library, nutrition, calendar_month,
/// person_add) no renderizaban en la build de producción — la fuente
/// empaquetada no tenía esos glifos aunque el flag `--no-tree-shake-icons`
/// estuviera activo. `Icons` viene con Flutter, ya se usa en toda la app y
/// no tiene ese riesgo.
class TrainerNavItem {
  const TrainerNavItem({
    required this.label,
    required this.icon,
    required this.path,
  });

  final String label;
  final IconData icon;
  final String path;

  /// Los 9 módulos del panel de entrenador, en el orden en que deben
  /// aparecer en la navegación.
  static const List<TrainerNavItem> all = [
    TrainerNavItem(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      path: AppRoutes.trainerHome,
    ),
    TrainerNavItem(
      label: 'Clientes',
      icon: Icons.group_outlined,
      path: AppRoutes.trainerClients,
    ),
    TrainerNavItem(
      label: 'Rutinas',
      icon: Icons.fitness_center,
      path: AppRoutes.trainerRoutines,
    ),
    TrainerNavItem(
      label: 'Biblioteca de ejercicios',
      icon: Icons.video_library_outlined,
      path: AppRoutes.trainerExerciseLibrary,
    ),
    TrainerNavItem(
      label: 'Programas',
      icon: Icons.calendar_view_month_outlined,
      path: AppRoutes.trainerPrograms,
    ),
    TrainerNavItem(
      label: 'Planes nutricionales',
      icon: Icons.restaurant_outlined,
      path: AppRoutes.trainerNutritionPlans,
    ),
    TrainerNavItem(
      label: 'Calendario',
      icon: Icons.calendar_month_outlined,
      path: AppRoutes.trainerCalendar,
    ),
    TrainerNavItem(
      label: 'Seguimiento de progreso',
      icon: Icons.trending_up_outlined,
      path: AppRoutes.trainerProgress,
    ),
    TrainerNavItem(
      label: 'Configuración',
      icon: Icons.settings_outlined,
      path: AppRoutes.trainerSettings,
    ),
  ];
}
