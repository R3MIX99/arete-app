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
import '../widgets/calendar_day_cell.dart';
import '../widgets/calendar_day_sessions_panel.dart';
import '../widgets/clients_empty_state.dart';

const _weekdayShortLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/// Ancho de pantalla a partir del cual el detalle del día se muestra como
/// panel fijo del lado derecho en vez de un drawer que se abre por
/// encima del contenido.
const _desktopBreakpoint = 900.0;

/// Calendario del entrenador: sesiones programadas de todos sus clientes
/// (calculadas a partir de sus programas/rutinas asignados, ver
/// `calendar_logic.dart`), en vista semanal o mensual, filtrable por
/// cliente. Cada día muestra solo un número (cuántos clientes entrenan),
/// nunca nombres ni horarios; el detalle aparece al elegir el día.
class TrainerCalendarScreen extends ConsumerWidget {
  const TrainerCalendarScreen({super.key});

  void _shift(WidgetRef ref, int direction) {
    final mode = ref.read(calendarViewModeProvider);
    final focused = ref.read(calendarFocusedDateProvider);
    final next = mode == CalendarViewMode.week
        ? focused.add(Duration(days: 7 * direction))
        : DateTime(focused.year, focused.month + direction, 1);
    ref.read(calendarFocusedDateProvider.notifier).state = dateOnly(next);
    // El día antes seleccionado puede quedar fuera del rango visible.
    ref.read(calendarSelectedDateProvider.notifier).state = null;
  }

  void _selectDay(
    BuildContext context,
    WidgetRef ref, {
    required bool isDesktop,
    required DateTime date,
    required List<CalendarSession> sessions,
  }) {
    if (isDesktop) {
      ref.read(calendarSelectedDateProvider.notifier).state = date;
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SafeArea(
          child: SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(AppSpacing.md),
            child: CalendarDaySessionsPanel(date: date, sessions: sessions),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDesktop = MediaQuery.sizeOf(context).width >= _desktopBreakpoint;
    final mode = ref.watch(calendarViewModeProvider);
    final focused = ref.watch(calendarFocusedDateProvider);
    final sessionsAsync = ref.watch(calendarSessionsByDateProvider);
    final (rangeStart, rangeEnd) = ref.watch(calendarVisibleRangeProvider);
    final clientsAsync = ref.watch(clientsProvider);
    final clientFilter = ref.watch(calendarClientFilterProvider);
    final selectedDate = ref.watch(calendarSelectedDateProvider);

    final rangeLabel = mode == CalendarViewMode.week
        ? '${DateFormat('d MMM', 'es_419').format(rangeStart)} - '
            '${DateFormat('d MMM y', 'es_419').format(rangeEnd)}'
        : _capitalize(DateFormat('MMMM y', 'es_419').format(focused));

    final calendarColumn = SafeArea(
      right: !isDesktop,
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
                  onSelectionChanged: (selection) {
                    ref.read(calendarViewModeProvider.notifier).state =
                        selection.first;
                    ref.read(calendarSelectedDateProvider.notifier).state =
                        null;
                  },
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
                  onPressed: () {
                    ref.read(calendarFocusedDateProvider.notifier).state =
                        dateOnly(DateTime.now());
                    ref.read(calendarSelectedDateProvider.notifier).state =
                        null;
                  },
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
              data: (clients) => _ClientFilterDropdown(
                clients: clients,
                selectedClientId: clientFilter,
                onChanged: (value) => ref
                    .read(calendarClientFilterProvider.notifier)
                    .state = value,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: switch (sessionsAsync) {
              AsyncLoading() => const Center(child: CircularProgressIndicator()),
              AsyncError() => const ClientsEmptyState(
                  icon: AppIconPaths.error,
                  title: 'No se pudo cargar el calendario',
                  message: 'Intenta de nuevo en unos minutos.',
                ),
              AsyncValue(:final value?) => mode == CalendarViewMode.week
                  ? _WeekRow(
                      rangeStart: rangeStart,
                      sessionsByDate: value,
                      selectedDate: selectedDate,
                      onSelectDay: (date, sessions) => _selectDay(
                        context,
                        ref,
                        isDesktop: isDesktop,
                        date: date,
                        sessions: sessions,
                      ),
                    )
                  : _MonthGrid(
                      rangeStart: rangeStart,
                      rangeEnd: rangeEnd,
                      focusedMonth: focused,
                      sessionsByDate: value,
                      selectedDate: selectedDate,
                      onSelectDay: (date, sessions) => _selectDay(
                        context,
                        ref,
                        isDesktop: isDesktop,
                        date: date,
                        sessions: sessions,
                      ),
                    ),
              _ => const SizedBox.shrink(),
            },
          ),
        ],
      ),
    );

    if (!isDesktop) {
      return Scaffold(backgroundColor: Colors.transparent, body: calendarColumn);
    }

    final sessionsByDate = sessionsAsync.valueOrNull ?? const {};
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: calendarColumn),
          Container(
            width: 320,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
            ),
            child: SafeArea(
              left: false,
              child: selectedDate == null
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppIcon(
                            AppIconPaths.calendarMonth,
                            size: 32,
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.3,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            'Elige un día para ver quién entrena',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurface.withValues(
                                alpha: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : SingleChildScrollView(
                      child: CalendarDaySessionsPanel(
                        date: selectedDate,
                        sessions: sessionsByDate[selectedDate] ?? const [],
                        onClose: () => ref
                            .read(calendarSelectedDateProvider.notifier)
                            .state = null,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

String _capitalize(String text) =>
    text.isEmpty ? text : text[0].toUpperCase() + text.substring(1);

/// Selector de cliente escalable a muchos clientes: campo con buscador
/// integrado en vez de una fila de chips que se vuelve inmanejable con
/// decenas de clientes.
class _ClientFilterDropdown extends StatelessWidget {
  const _ClientFilterDropdown({
    required this.clients,
    required this.selectedClientId,
    required this.onChanged,
  });

  final List<dynamic> clients;
  final String? selectedClientId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 280,
      child: DropdownMenu<String?>(
        width: 280,
        initialSelection: selectedClientId,
        enableFilter: true,
        enableSearch: true,
        requestFocusOnTap: true,
        leadingIcon: const AppIcon(AppIconPaths.group, size: 18),
        hintText: 'Filtrar por cliente',
        onSelected: onChanged,
        dropdownMenuEntries: [
          const DropdownMenuEntry(value: null, label: 'Todos los clientes'),
          for (final client in clients)
            DropdownMenuEntry(value: client.id, label: client.displayName),
        ],
      ),
    );
  }
}

class _WeekRow extends StatelessWidget {
  const _WeekRow({
    required this.rangeStart,
    required this.sessionsByDate,
    required this.selectedDate,
    required this.onSelectDay,
  });

  final DateTime rangeStart;
  final Map<DateTime, List<CalendarSession>> sessionsByDate;
  final DateTime? selectedDate;
  final void Function(DateTime date, List<CalendarSession> sessions)
      onSelectDay;

  @override
  Widget build(BuildContext context) {
    final today = dateOnly(DateTime.now());

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < 7; i++)
            Expanded(
              child: Builder(
                builder: (context) {
                  final date = rangeStart.add(Duration(days: i));
                  final sessions = sessionsByDate[date] ?? const [];
                  return CalendarDayCell(
                    date: date,
                    weekdayLabel: _weekdayShortLabels[i],
                    isToday: date == today,
                    isSelected: date == selectedDate,
                    sessionCount: sessions.length,
                    onTap: () => onSelectDay(date, sessions),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.rangeStart,
    required this.rangeEnd,
    required this.focusedMonth,
    required this.sessionsByDate,
    required this.selectedDate,
    required this.onSelectDay,
  });

  final DateTime rangeStart;
  final DateTime rangeEnd;
  final DateTime focusedMonth;
  final Map<DateTime, List<CalendarSession>> sessionsByDate;
  final DateTime? selectedDate;
  final void Function(DateTime date, List<CalendarSession> sessions)
      onSelectDay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = dateOnly(DateTime.now());
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
                    child: Text(label, style: theme.textTheme.labelLarge),
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
                    child: Builder(
                      builder: (context) {
                        final date =
                            rangeStart.add(Duration(days: week * 7 + day));
                        final sessions = sessionsByDate[date] ?? const [];
                        return CalendarDayCell(
                          date: date,
                          isToday: date == today,
                          isSelected: date == selectedDate,
                          isDimmed: date.month != focusedMonth.month,
                          sessionCount: sessions.length,
                          onTap: () => onSelectDay(date, sessions),
                        );
                      },
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
