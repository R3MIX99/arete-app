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
/// cliente. Cada día muestra solo un indicador de cuántos clientes
/// entrenan (nunca nombres ni horarios); el detalle aparece al elegir el
/// día.
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

  /// Escritorio y la tira de semana en teléfono: el detalle se despliega
  /// en el propio panel/tira (sin abrir nada encima), así que solo hace
  /// falta guardar qué día está elegido — y volver a tocarlo lo cierra.
  void _toggleSelectedDay(WidgetRef ref, DateTime date) {
    final current = ref.read(calendarSelectedDateProvider);
    ref.read(calendarSelectedDateProvider.notifier).state =
        current == date ? null : date;
  }

  /// Mes en teléfono: la celda es chica y no hay panel fijo, así que el
  /// detalle se abre como drawer encima del contenido.
  void _openDayDrawer(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
    List<CalendarSession> sessions,
  ) {
    ref.read(calendarSelectedDateProvider.notifier).state = date;
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
    ).whenComplete(
      () => ref.read(calendarSelectedDateProvider.notifier).state = null,
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
    final sessionsByDate = sessionsAsync.valueOrNull ?? const {};

    final rangeLabel = mode == CalendarViewMode.week
        ? '${DateFormat('d MMM', 'es_419').format(rangeStart)} - '
            '${DateFormat('d MMM y', 'es_419').format(rangeEnd)}'
        : _capitalize(DateFormat('MMMM y', 'es_419').format(focused));

    final calendarColumn = SafeArea(
      right: !isDesktop,
      child: Column(
        children: [
          _CalendarHeader(
            mode: mode,
            rangeLabel: rangeLabel,
            onModeChanged: (value) {
              ref.read(calendarViewModeProvider.notifier).state = value;
              ref.read(calendarSelectedDateProvider.notifier).state = null;
            },
            onPrevious: () => _shift(ref, -1),
            onNext: () => _shift(ref, 1),
            onToday: () {
              ref.read(calendarFocusedDateProvider.notifier).state =
                  dateOnly(DateTime.now());
              ref.read(calendarSelectedDateProvider.notifier).state = null;
            },
            clientsAsync: clientsAsync,
            selectedClientId: clientFilter,
            onClientChanged: (value) => ref
                .read(calendarClientFilterProvider.notifier)
                .state = value,
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
                  ? (isDesktop
                      ? _WeekRow(
                          rangeStart: rangeStart,
                          sessionsByDate: value,
                          selectedDate: selectedDate,
                          onSelectDay: (date, _) =>
                              _toggleSelectedDay(ref, date),
                        )
                      : _MobileWeekStrip(
                          rangeStart: rangeStart,
                          sessionsByDate: value,
                          selectedDate: selectedDate,
                          onSelectDay: (date) =>
                              _toggleSelectedDay(ref, date),
                        ))
                  : _MonthGrid(
                      rangeStart: rangeStart,
                      rangeEnd: rangeEnd,
                      focusedMonth: focused,
                      sessionsByDate: value,
                      selectedDate: selectedDate,
                      onSelectDay: (date, sessions) => isDesktop
                          ? _toggleSelectedDay(ref, date)
                          : _openDayDrawer(context, ref, date, sessions),
                    ),
              _ => const SizedBox.shrink(),
            },
          ),
        ],
      ),
    );

    if (!isDesktop) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: calendarColumn,
      );
    }

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

/// Encabezado del calendario: primero cómo moverse (semana/mes, hoy),
/// después dónde estás parado (rango de fechas, filtro de cliente).
class _CalendarHeader extends StatelessWidget {
  const _CalendarHeader({
    required this.mode,
    required this.rangeLabel,
    required this.onModeChanged,
    required this.onPrevious,
    required this.onNext,
    required this.onToday,
    required this.clientsAsync,
    required this.selectedClientId,
    required this.onClientChanged,
  });

  final CalendarViewMode mode;
  final String rangeLabel;
  final ValueChanged<CalendarViewMode> onModeChanged;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onToday;
  final AsyncValue<List<dynamic>> clientsAsync;
  final String? selectedClientId;
  final ValueChanged<String?> onClientChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.md,
        AppSpacing.md,
        0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
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
                    onModeChanged(selection.first),
              ),
              const SizedBox(width: AppSpacing.sm),
              TextButton(onPressed: onToday, child: const Text('Hoy')),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              IconButton(
                tooltip: 'Anterior',
                onPressed: onPrevious,
                icon: Transform.rotate(
                  angle: 3.14159,
                  child: const AppIcon(AppIconPaths.chevronRight, size: 16),
                ),
                visualDensity: VisualDensity.compact,
              ),
              Text(rangeLabel, style: theme.textTheme.titleSmall),
              IconButton(
                tooltip: 'Siguiente',
                onPressed: onNext,
                icon: const AppIcon(AppIconPaths.chevronRight, size: 16),
                visualDensity: VisualDensity.compact,
              ),
              const Spacer(),
              clientsAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (_, _) => const SizedBox.shrink(),
                data: (clients) => _ClientFilterDropdown(
                  clients: clients,
                  selectedClientId: selectedClientId,
                  onChanged: onClientChanged,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Selector de cliente escalable a muchos clientes: campo compacto con
/// buscador integrado en vez de una fila de chips que se vuelve
/// inmanejable con decenas de clientes.
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
    const width = 190.0;
    return DropdownMenu<String?>(
      width: width,
      initialSelection: selectedClientId,
      enableFilter: true,
      enableSearch: true,
      requestFocusOnTap: true,
      textStyle: Theme.of(context).textTheme.bodySmall,
      leadingIcon: const Padding(
        padding: EdgeInsets.only(left: 4),
        child: AppIcon(AppIconPaths.group, size: 14),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        isDense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
      hintText: 'Cliente',
      onSelected: onChanged,
      dropdownMenuEntries: [
        const DropdownMenuEntry(value: null, label: 'Todos los clientes'),
        for (final client in clients)
          DropdownMenuEntry(value: client.id, label: client.displayName),
      ],
    );
  }
}

/// Fila de días de escritorio: tarjetas con borde suave, número grande de
/// sesiones en la esquina.
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

/// Semana en teléfono: solo la tira de días (sin líneas, un punto si hay
/// sesiones), un divisor tenue debajo, y — al tocar un día — el detalle
/// se despliega ahí mismo, debajo, en vez de abrir algo encima.
class _MobileWeekStrip extends StatelessWidget {
  const _MobileWeekStrip({
    required this.rangeStart,
    required this.sessionsByDate,
    required this.selectedDate,
    required this.onSelectDay,
  });

  final DateTime rangeStart;
  final Map<DateTime, List<CalendarSession>> sessionsByDate;
  final DateTime? selectedDate;
  final ValueChanged<DateTime> onSelectDay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = dateOnly(DateTime.now());

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
            child: Row(
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
                          bordered: false,
                          indicator: CalendarDayIndicator.dot,
                          onTap: () => onSelectDay(date),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            height: 1,
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: selectedDate == null
                ? const SizedBox(width: double.infinity)
                : Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      AppSpacing.md,
                      AppSpacing.md,
                      0,
                    ),
                    child: CalendarDaySessionsPanel(
                      date: selectedDate!,
                      sessions: sessionsByDate[selectedDate] ?? const [],
                    ),
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
