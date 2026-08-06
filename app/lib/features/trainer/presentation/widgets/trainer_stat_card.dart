import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';

/// Tarjeta de resumen numérico del dashboard (clientes activos, rutinas
/// creadas, etc.).
class TrainerStatCard extends StatelessWidget {
  const TrainerStatCard({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: theme.colorScheme.primary, size: 22),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: theme.textTheme.headlineMedium?.copyWith(
              // Cifras de ancho fijo: el número no debe temblar si cambia.
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(label, style: theme.textTheme.bodyMedium),
        ],
      ),
    );
  }
}
