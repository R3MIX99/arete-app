import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../domain/calendar_logic.dart';
import '../domain/calendar_session.dart';
import 'calendar_repository.dart';

final calendarRepositoryProvider = Provider<CalendarRepository>((ref) {
  return CalendarRepository(ref.watch(supabaseClientProvider));
});

final calendarAssignmentsProvider = FutureProvider((ref) {
  return ref.watch(calendarRepositoryProvider).fetchAllAssignments();
});

enum CalendarViewMode { week, month }

final calendarViewModeProvider = StateProvider<CalendarViewMode>(
  (ref) => CalendarViewMode.week,
);

/// Cualquier día dentro de la semana/mes que se está mostrando; navegar
/// "anterior"/"siguiente" mueve este valor una semana o un mes.
final calendarFocusedDateProvider = StateProvider<DateTime>(
  (ref) => dateOnly(DateTime.now()),
);

/// `null` significa "todos los clientes".
final calendarClientFilterProvider = StateProvider<String?>((ref) => null);

/// El día seleccionado para ver su detalle (panel lateral en escritorio,
/// drawer en teléfono). `null` cuando no hay ninguno elegido.
final calendarSelectedDateProvider = StateProvider<DateTime?>((ref) => null);

(DateTime, DateTime) _visibleRange(CalendarViewMode mode, DateTime focused) {
  if (mode == CalendarViewMode.week) {
    final start = mondayOfWeek(focused);
    return (start, start.add(const Duration(days: 6)));
  }
  final firstOfMonth = DateTime(focused.year, focused.month, 1);
  final firstOfNextMonth = DateTime(focused.year, focused.month + 1, 1);
  final lastOfMonth = firstOfNextMonth.subtract(const Duration(days: 1));
  // La grilla del mes empieza en el lunes de la semana del día 1 y
  // termina en el domingo de la semana del último día, para no dejar
  // huecos sueltos al principio o al final.
  return (mondayOfWeek(firstOfMonth), mondayOfWeek(lastOfMonth).add(const Duration(days: 6)));
}

/// El rango de fechas (inicio, fin incluido) que corresponde a la vista
/// actual (semana o mes) alrededor de [calendarFocusedDateProvider].
final calendarVisibleRangeProvider = Provider<(DateTime, DateTime)>((ref) {
  final mode = ref.watch(calendarViewModeProvider);
  final focused = ref.watch(calendarFocusedDateProvider);
  return _visibleRange(mode, focused);
});

final calendarSessionsByDateProvider =
    Provider<AsyncValue<Map<DateTime, List<CalendarSession>>>>((ref) {
  final assignmentsAsync = ref.watch(calendarAssignmentsProvider);
  final clientFilter = ref.watch(calendarClientFilterProvider);
  final (rangeStart, rangeEnd) = ref.watch(calendarVisibleRangeProvider);

  return assignmentsAsync.whenData((assignments) {
    final filtered = clientFilter == null
        ? assignments
        : assignments.where((a) => a.clientId == clientFilter).toList();
    final sessions = sessionsInRange(
      filtered,
      rangeStart: rangeStart,
      rangeEndInclusive: rangeEnd,
    );
    return groupSessionsByDate(sessions);
  });
});
