import 'package:supabase_flutter/supabase_flutter.dart';

import 'catalog_failure.dart';

/// Actualiza los datos de configuración del propio entrenador. Solo toca
/// las columnas que el GRANT de `profiles` ya permite editar a un usuario
/// sobre su propia fila (ver 20260813010000_add_trainer_business_settings.sql).
class TrainerSettingsRepository {
  const TrainerSettingsRepository(this._client);

  final SupabaseClient _client;

  Future<void> updateProfile({
    required String userId,
    required String fullName,
    String? phone,
    String? businessName,
  }) async {
    try {
      await _client
          .from('profiles')
          .update({
            'full_name': fullName.trim(),
            'phone': (phone == null || phone.trim().isEmpty) ? null : phone.trim(),
            'business_name': (businessName == null || businessName.trim().isEmpty)
                ? null
                : businessName.trim(),
          })
          .eq('id', userId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }

  Future<void> updateNotificationPreferences({
    required String userId,
    required bool notifyEmail,
    required bool notifyPush,
  }) async {
    try {
      await _client
          .from('profiles')
          .update({'notify_email': notifyEmail, 'notify_push': notifyPush})
          .eq('id', userId);
    } catch (error) {
      throw CatalogFailure.fromException(error);
    }
  }
}
