import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../domain/trainer_dashboard_summary.dart';

/// Una fila de "próximas sesiones de hoy": hora, cliente y tipo de sesión.
class UpcomingSessionTile extends StatelessWidget {
  const UpcomingSessionTile({super.key, required this.session});

  final UpcomingSession session;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hour = session.time.hour.toString().padLeft(2, '0');
    final minute = session.time.minute.toString().padLeft(2, '0');
    final time = '$hour:$minute';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 52,
            child: Text(
              time,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          Container(
            width: 1,
            height: 32,
            color: theme.colorScheme.outline,
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          ),
          Icon(
            Symbols.event,
            size: 20,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(session.clientName, style: theme.textTheme.bodyLarge),
                Text(session.sessionType, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
