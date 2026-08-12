import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../domain/calendar_session.dart';
import 'calendar_session_tile.dart';

/// Detalle de un día: cuántos clientes tienen sesión y cuáles, con un
/// poco más de información que la celda del calendario. Se reutiliza
/// tanto en el panel lateral de escritorio como en el drawer de
/// teléfono, para que ambos se vean y se comporten igual.
class CalendarDaySessionsPanel extends StatelessWidget {
  const CalendarDaySessionsPanel({
    super.key,
    required this.date,
    required this.sessions,
    this.onClose,
  });

  final DateTime date;
  final List<CalendarSession> sessions;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateLabel = _capitalize(
      DateFormat('EEEE d \'de\' MMMM', 'es_419').format(date),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(dateLabel, style: theme.textTheme.titleMedium),
            ),
            if (onClose != null)
              IconButton(
                tooltip: 'Cerrar',
                onPressed: onClose,
                icon: const AppIcon(AppIconPaths.close, size: 18),
              ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          sessions.isEmpty
              ? 'Sin sesiones programadas'
              : '${sessions.length} '
                  '${sessions.length == 1 ? 'cliente entrena' : 'clientes entrenan'} '
                  'este día',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        if (sessions.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Center(
              child: Column(
                children: [
                  AppIcon(
                    AppIconPaths.event,
                    size: 32,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'No hay clientes entrenando este día',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(
                        alpha: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          for (final session in sessions)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xs),
              child: CalendarSessionTile(session: session),
            ),
      ],
    );
  }
}

String _capitalize(String text) =>
    text.isEmpty ? text : text[0].toUpperCase() + text.substring(1);
