import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/router/app_routes.dart';

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
  final IconData icon;
  final String path;

  /// Los 9 módulos del panel de entrenador, en el orden en que deben
  /// aparecer en la navegación.
  static const List<TrainerNavItem> all = [
    TrainerNavItem(
      label: 'Dashboard',
      icon: Symbols.dashboard,
      path: AppRoutes.trainerHome,
    ),
    TrainerNavItem(
      label: 'Clientes',
      icon: Symbols.group,
      path: AppRoutes.trainerClients,
    ),
    TrainerNavItem(
      label: 'Rutinas',
      icon: Symbols.fitness_center,
      path: AppRoutes.trainerRoutines,
    ),
    TrainerNavItem(
      label: 'Biblioteca de ejercicios',
      icon: Symbols.video_library,
      path: AppRoutes.trainerExerciseLibrary,
    ),
    TrainerNavItem(
      label: 'Programas',
      icon: Symbols.calendar_view_month,
      path: AppRoutes.trainerPrograms,
    ),
    TrainerNavItem(
      label: 'Planes nutricionales',
      icon: Symbols.nutrition,
      path: AppRoutes.trainerNutritionPlans,
    ),
    TrainerNavItem(
      label: 'Calendario',
      icon: Symbols.calendar_month,
      path: AppRoutes.trainerCalendar,
    ),
    TrainerNavItem(
      label: 'Seguimiento de progreso',
      icon: Symbols.monitoring,
      path: AppRoutes.trainerProgress,
    ),
    TrainerNavItem(
      label: 'Configuración',
      icon: Symbols.settings,
      path: AppRoutes.trainerSettings,
    ),
  ];
}
