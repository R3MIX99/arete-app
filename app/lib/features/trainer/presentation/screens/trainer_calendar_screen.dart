import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_icon_paths.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_icon.dart';
import '../../data/calendar_providers.dart';
import '../../data/clients_providers.dart';
import '../../domain/calendar_logic.dart';
import '../../domain/calendar_session.dart';
import '../widgets/calendar_session_tile.dart';
import '../widgets/clients_empty_state.dart';

const _weekdayShortLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/// Calendario del entrenador: sesiones programadas de todos sus clientes
/// (calculadas a partir de sus programas/rutinas asignados, ver
/// `calendar_logic.dart`), en vista semanal o mensual, filtrable por
/// cliente.
class TrainerCalendarScreen extends ConsumerWidget {
  const TrainerCalendarScreen({super.key});

  void _shift(WidgetRef ref, int direction) {
    final mode = ref.read(calendarViewModeProvider);
    final focused = ref.read(calendarFocusedDateProvider);
    final next = mode == CalendarViewMode.week
        ? focused.add(Duration(days: 7 * direction))
        : DateTime(focused.year, focused.month + direction, 1);
    ref.read(calendarFocusedDateProvider.notifier).state = dateOnly(next);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final mode = ref.watch(calendarViewModeProvider);
    final focused = ref.watch(calendarFocusedDateProvider);
    final sessionsAsync = ref.watch(calendarSessionsByDateProvider);
    final (rangeStart, rangeEnd) = ref.watch(calendarVisibleRangeProvider);
    final clientsAsync = ref.watch(clientsProvider);
    final clientFilter = ref.watch(calendarClientFilterProvider);

    final rangeLabel = mode == CalendarViewMode.week
        ? '${DateFormat('d MMM', 'es_419').format(rangeStart)} - '
            '${DateFormat('d MMM y', 'es_419').format(rangeEnd)}'
        : _capitalize(DateFormat('MMMM y', 'es_419').format(focused));

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.sm,
              ),
              child: Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  SegmentedButton<CalendarViewMode>(
                    segments: const [
                      ButtonSegment(
                        value: CalendarViewMode.week,
                        label: Text('Semana'),
                      ),
                      ButtonSegment(
                        value: CalendarViewMode.month,
                        label: Text('Mes'),
                      ),
                    ],
                    selected: {mode},
                    onSelectionChanged: (selection) =>
                        ref.read(calendarViewModeProvider.notifier).state =
                            selection.first,
                  ),
                  IconButton(
                    tooltip: 'Anterior',
                    onPressed: () => _shift(ref, -1),
                    icon: Transform.rotate(
                      angle: 3.14159,
                      child: const AppIcon(AppIconPaths.chevronRight, size: 18),
                    ),
                  ),
                  Text(rangeLabel, style: theme.textTheme.titleMedium),
                  IconButton(
                    tooltip: 'Siguiente',
                    onPressed: () => _shift(ref, 1),
                    icon: const AppIcon(AppIconPaths.chevronRight, size: 18),
                  ),
                  TextButton(
                    onPressed: () => ref
                        .read(calendarFocusedDateProvider.notifier)
                        .state = dateOnly(DateTime.now()),
                    child: const Text('Hoy'),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: clientsAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, _) => const SizedBox.shrink(),
                data: (clients) => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      FilterChip(
                        label: const Text('Todos'),
                        selected: clientFilter == null,
                        showCheckmark: false,
                        onSelected: (_) => ref
                            .read(calendarClientFilterProvider.notifier)
                            .state = null,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      for (final client in clients) ...[
                        FilterChip(
                          label: Text(client.displayName),
                          selected: clientFilter == client.id,
                          showCheckmark: false,
                          onSelected: (selected) => ref
                              .read(calendarClientFilterProvider.notifier)
                              .state = selected ? client.id : null,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: switch (sessionsAsync) {
                AsyncLoading() =>
                  const Center(child: CircularProgressIndicator()),
                AsyncError() => const ClientsEmptyState(
                    icon: AppIconPaths.error,
                    title: 'No se pudo cargar el calendario',
                    message: 'Intenta de nuevo en unos minutos.',
                  ),
                AsyncValue(:final value?) => mode == CalendarViewMode.week
                    ? _WeekGrid(rangeStart: rangeStart, sessionsByDate: value)
                    : _MonthGrid(
                        rangeStart: rangeStart,
                        rangeEnd: rangeEnd,
                        focusedMonth: focused,
                        sessionsByDate: value,
                      ),
                _ => const SizedBox.shrink(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

String _capitalize(String text) =>
    text.isEmpty ? text : text[0].toUpperCase() + text.substring(1);

class _WeekGrid extends StatelessWidget {
  const _WeekGrid({required this.rangeStart, required this.sessionsByDate});

  final DateTime rangeStart;
  final Map<DateTime, List<CalendarSession>> sessionsByDate;

  @override
  Widget build(BuildContext context) {
    final today = dateOnly(DateTime.now());

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < 7; i++)
            SizedBox(
              width: 180,
              child: Padding(
                padding: const EdgeInsets.only(right: AppSpacing.sm),
                child: _DayColumn(
                  date: rangeStart.add(Duration(days: i)),
                  label: _weekdayShortLabels[i],
                  isToday: rangeStart.add(Duration(days: i)) == today,
                  sessions:
                      sessionsByDate[rangeStart.add(Duration(days: i))] ??
                          const [],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DayColumn extends StatelessWidget {
  const _DayColumn({
    required this.date,
    required this.label,
    required this.isToday,
    required this.sessions,
  });

  final DateTime date;
  final String label;
  final bool isToday;
  final List<CalendarSession> sessions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: AppSpacing.xs),
            Container(
              width: 22,
              height: 22,
              alignment: Alignment.center,
              decoration: isToday
                  ? BoxDecoration(
                      color: theme.colorScheme.primary,
                      shape: BoxShape.circle,
                    )
                  : null,
              child: Text(
                '${date.day}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isToday ? Colors.white : null,
                  fontWeight: isToday ? FontWeight.w700 : null,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        if (sessions.isEmpty)
          Text(
            'Sin sesiones',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          )
        else
          for (final session in sessions)
            CalendarSessionTile(session: session),
      ],
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.rangeStart,
    required this.rangeEnd,
    required this.focusedMonth,
    required this.sessionsByDate,
  });

  final DateTime rangeStart;
  final DateTime rangeEnd;
  final DateTime focusedMonth;
  final Map<DateTime, List<CalendarSession>> sessionsByDate;

  @override
  Widget build(BuildContext context) {
    final totalDays = rangeEnd.difference(rangeStart).inDays + 1;
    final weeks = (totalDays / 7).ceil();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Column(
        children: [
          Row(
            children: [
              for (final label in _weekdayShortLabels)
                Expanded(
                  child: Center(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          for (var week = 0; week < weeks; week++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var day = 0; day < 7; day++)
                  Expanded(
                    child: _MonthCell(
                      date: rangeStart.add(Duration(days: week * 7 + day)),
                      inCurrentMonth: rangeStart
                              .add(Duration(days: week * 7 + day))
                              .month ==
                          focusedMonth.month,
                      sessions: sessionsByDate[rangeStart.add(
                            Duration(days: week * 7 + day),
                          )] ??
                          const [],
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _MonthCell extends StatelessWidget {
  const _MonthCell({
    required this.date,
    required this.inCurrentMonth,
    required this.sessions,
  });

  final DateTime date;
  final bool inCurrentMonth;
  final List<CalendarSession> sessions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = dateOnly(DateTime.now());
    final isToday = date == today;
    const maxVisible = 2;

    return InkWell(
      onTap:
          sessions.isEmpty ? null : () => _showDaySheet(context, date, sessions),
      child: Container(
        margin: const EdgeInsets.all(2),
        padding: const EdgeInsets.all(4),
        constraints: const BoxConstraints(minHeight: 84),
        decoration: BoxDecoration(
          border: Border.all(color: theme.colorScheme.outline),
          borderRadius: BorderRadius.circular(8),
          color: isToday
              ? theme.colorScheme.primary.withValues(alpha: 0.06)
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${date.day}',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: inCurrentMonth
                    ? (isToday ? theme.colorScheme.primary : null)
                    : theme.colorScheme.onSurface.withValues(alpha: 0.35),
                fontWeight: isToday ? FontWeight.w700 : null,
              ),
            ),
            for (final session in sessions.take(maxVisible))
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '${session.clientName} · ${session.routineName}',
                  style: theme.textTheme.labelLarge?.copyWith(fontSize: 10),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            if (sessions.length > maxVisible)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  '+${sessions.length - maxVisible} más',
                  style: theme.textTheme.labelLarge?.copyWith(
                    fontSize: 10,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showDaySheet(
    BuildContext context,
    DateTime date,
    List<CalendarSession> sessions,
  ) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _capitalize(DateFormat('EEEE d MMMM', 'es_419').format(date)),
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                for (final session in sessions)
                  CalendarSessionTile(session: session),
              ],
            ),
          ),
        );
      },
    );
  }
}
