import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/calendar_assignment.dart';
import 'catalog_failure.dart';

/// Acceso a todas las asignaciones (programas y rutinas sueltas) del
/// entrenador, de todos sus clientes a la vez — es lo que necesita el
/// calendario para calcular sesiones (ver `calendar_logic.dart`). Las
/// políticas de RLS de `client_assignments` ya limitan esto a las
/// asignaciones del propio entrenador.
class CalendarRepository {
  const CalendarRepository(this._client);

  final SupabaseClient _client;

  static const String _fields =
      '*, profiles!client_assignments_client_id_fkey(full_name, email), '
      'programs(id, name, duration_weeks, '
      'program_routines(id, week_number, day_of_week, routines(name))), '
      'routines(name), '
      'assignment_overrides(program_routine_id, routines(name))';

  Future<List<CalendarAssignment>> fetchAllAssignments() async {
    try {
      final rows = await _client.from('client_assignments').select(_fields);
      return rows.map(CalendarAssignment.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
