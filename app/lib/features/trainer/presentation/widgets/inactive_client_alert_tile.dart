import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../domain/trainer_dashboard_summary.dart';

/// Alerta de un cliente sin actividad reciente. Combina color, ícono y
/// texto (nunca solo color) para que la advertencia sea clara también sin
/// distinguir colores.
class InactiveClientAlertTile extends StatelessWidget {
  const InactiveClientAlertTile({super.key, required this.alert});

  final InactiveClientAlert alert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_outlined, size: 20, color: AppColors.warning),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(alert.clientName, style: theme.textTheme.bodyLarge),
                Text(
                  'Sin actividad hace ${alert.daysSinceLastActivity} días',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.warning,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
