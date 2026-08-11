import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../../shared/widgets/app_card.dart';
import '../../data/trainer_dashboard_mock_provider.dart';
import '../widgets/inactive_client_alert_tile.dart';
import '../widgets/trainer_stat_card.dart';
import '../widgets/upcoming_session_tile.dart';

/// Dashboard del panel de entrenador: resumen del negocio del entrenador
/// de un vistazo, con accesos directos a las acciones más usadas.
///
/// Los datos vienen de [trainerDashboardMockProvider] (de ejemplo, ver esa
/// clase); se conectan a Supabase en una fase posterior sin cambiar esta
/// pantalla.
class TrainerDashboardScreen extends ConsumerWidget {
  const TrainerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final summary = ref.watch(trainerDashboardMockProvider);
    final isWide = MediaQuery.sizeOf(context).width >= 600;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Resumen', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          GridView.count(
            crossAxisCount: isWide ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: AppSpacing.md,
            mainAxisSpacing: AppSpacing.md,
            childAspectRatio: 1.5,
            children: [
              TrainerStatCard(
                icon: AppIconPaths.group,
                value: '${summary.activeClientsCount}',
                label: 'Clientes activos',
              ),
              TrainerStatCard(
                icon: AppIconPaths.fitnessCenter,
                value: '${summary.routinesCreatedCount}',
                label: 'Rutinas creadas',
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Accesos directos', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _QuickActionButton(
                icon: AppIconPaths.addCircle,
                label: 'Crear rutina',
                onPressed: () => context.go(AppRoutes.trainerRoutines),
              ),
              _QuickActionButton(
                icon: AppIconPaths.nutrition,
                label: 'Crear dieta',
                onPressed: () => context.go(AppRoutes.trainerNutritionPlans),
              ),
              _QuickActionButton(
                icon: AppIconPaths.personAdd,
                label: 'Agregar cliente',
                onPressed: () => context.go(AppRoutes.trainerClients),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Sesiones de hoy', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: summary.upcomingSessionsToday.isEmpty
                ? Text(
                    'No tienes sesiones programadas para hoy.',
                    style: theme.textTheme.bodyMedium,
                  )
                : Column(
                    children: [
                      for (var i = 0; i < summary.upcomingSessionsToday.length; i++) ...[
                        if (i > 0) const Divider(height: 1),
                        UpcomingSessionTile(
                          session: summary.upcomingSessionsToday[i],
                        ),
                      ],
                    ],
                  ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Clientes sin actividad reciente', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          AppCard(
            child: summary.inactiveClientAlerts.isEmpty
                ? Text(
                    'Todos tus clientes tienen actividad reciente.',
                    style: theme.textTheme.bodyMedium,
                  )
                : Column(
                    children: [
                      for (var i = 0; i < summary.inactiveClientAlerts.length; i++) ...[
                        if (i > 0) const Divider(height: 1),
                        InactiveClientAlertTile(
                          alert: summary.inactiveClientAlerts[i],
                        ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  /// Ruta SVG del ícono (ver [AppIconPaths]).
  final String icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: AppIcon(icon, size: 18),
      label: Text(label),
    );
  }
}
