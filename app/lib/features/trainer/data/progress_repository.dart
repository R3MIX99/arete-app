import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/calendar_assignment.dart';
import '../domain/calendar_logic.dart';
import '../domain/progress_entry.dart';
import 'catalog_failure.dart';

/// Acceso a los registros de progreso de un cliente (peso, medidas, foto)
/// y al bucket privado donde viven las fotos.
class ProgressRepository {
  const ProgressRepository(this._client);

  final SupabaseClient _client;

  static const String _bucket = 'progress-photos';

  Future<List<ProgressEntry>> fetchEntries(String clientId) async {
    try {
      final rows = await _client
          .from('progress_entries')
          .select()
          .eq('client_id', clientId)
          .order('entry_date');
      return rows.map(ProgressEntry.fromJson).toList();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<ProgressEntry> createEntry({
    required String trainerId,
    required String clientId,
    required DateTime entryDate,
    double? weightKg,
    double? chestCm,
    double? waistCm,
    double? hipCm,
    double? armCm,
    double? thighCm,
    String? photoPath,
    String? notes,
  }) async {
    try {
      final dateOnly =
          '${entryDate.year.toString().padLeft(4, '0')}-'
          '${entryDate.month.toString().padLeft(2, '0')}-'
          '${entryDate.day.toString().padLeft(2, '0')}';
      final row = await _client
          .from('progress_entries')
          .insert({
            'trainer_id': trainerId,
            'client_id': clientId,
            'entry_date': dateOnly,
            if (weightKg != null) 'weight_kg': weightKg,
            if (chestCm != null) 'chest_cm': chestCm,
            if (waistCm != null) 'waist_cm': waistCm,
            if (hipCm != null) 'hip_cm': hipCm,
            if (armCm != null) 'arm_cm': armCm,
            if (thighCm != null) 'thigh_cm': thighCm,
            if (photoPath != null) 'photo_path': photoPath,
            if (notes != null && notes.trim().isNotEmpty)
              'notes': notes.trim(),
          })
          .select()
          .single();
      return ProgressEntry.fromJson(row);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> deleteEntry(String id) async {
    try {
      await _client.from('progress_entries').delete().eq('id', id);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Sube la foto al bucket privado bajo "{clientId}/{nombre de archivo}"
  /// (la ruta que validan las políticas de Storage) y devuelve esa ruta,
  /// lista para guardarse en `photo_path`.
  Future<String> uploadPhoto({
    required String clientId,
    required Uint8List bytes,
    required String fileExtension,
  }) async {
    try {
      final path =
          '$clientId/${DateTime.now().microsecondsSinceEpoch}.$fileExtension';
      await _client.storage.from(_bucket).uploadBinary(path, bytes);
      return path;
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// URL firmada de corta duración para mostrar una foto privada.
  Future<String> signedPhotoUrl(String path) async {
    try {
      return await _client.storage
          .from(_bucket)
          .createSignedUrl(path, 60 * 10);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<Set<DateTime>> fetchLoggedSessionDates(String clientId) async {
    try {
      final rows = await _client
          .from('client_set_logs')
          .select('session_date')
          .eq('client_id', clientId);
      return rows
          .map((row) => dateOnly(DateTime.parse(row['session_date'] as String)))
          .toSet();
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  /// Porcentaje de sesiones programadas que el cliente registró como
  /// hechas (al menos una serie de esa fecha en `client_set_logs`), en el
  /// rango pedido. `null` si no había sesiones programadas en ese rango
  /// (no hay nada que medir, distinto de 0% de cumplimiento).
  Future<double?> complianceRate({
    required String clientId,
    required List<CalendarAssignment> clientAssignments,
    required DateTime rangeStart,
    required DateTime rangeEnd,
  }) async {
    final scheduled = sessionsInRange(
      clientAssignments,
      rangeStart: rangeStart,
      rangeEndInclusive: rangeEnd,
    );
    if (scheduled.isEmpty) return null;

    final loggedDates = await fetchLoggedSessionDates(clientId);
    final scheduledDates = scheduled.map((s) => s.date).toSet();
    final completed =
        scheduledDates.where((date) => loggedDates.contains(date)).length;
    return completed / scheduledDates.length;
  }
}
