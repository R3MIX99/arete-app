import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/client_goal.dart';
import '../../shared/models/profile.dart';
import '../domain/client_invitation.dart';
import 'clients_failure.dart';

/// Acceso a los clientes de un entrenador.
///
/// Todas las consultas dependen además de las políticas de Row Level
/// Security de Supabase: aunque aquí no se filtrara por entrenador, la
/// base de datos igual solo devuelve los clientes propios. El filtro
/// explícito está para que la intención quede clara al leer el código, no
/// como mecanismo de seguridad.
class ClientsRepository {
  const ClientsRepository(this._client);

  final SupabaseClient _client;

  static const String _clientFields =
      'id, full_name, email, role, avatar_url, trainer_id, created_at, '
      'goal, health_notes, phone, status';

  /// Clientes del entrenador autenticado, del más reciente al más antiguo.
  Future<List<Profile>> fetchClients() async {
    try {
      final rows = await _client
          .from('profiles')
          .select(_clientFields)
          .eq('role', 'client')
          .order('created_at', ascending: false);
      return rows.map(Profile.fromJson).toList();
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  Future<Profile> fetchClient(String clientId) async {
    try {
      final row = await _client
          .from('profiles')
          .select(_clientFields)
          .eq('id', clientId)
          .single();
      return Profile.fromJson(row);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  /// Invitaciones que este entrenador todavía tiene pendientes.
  Future<List<ClientInvitation>> fetchPendingInvitations() async {
    try {
      final rows = await _client
          .from('client_invitations')
          .select()
          .eq('status', 'pending')
          .order('created_at', ascending: false);
      return rows.map(ClientInvitation.fromJson).toList();
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  /// Crea la invitación con los datos que cargó el entrenador. El cliente
  /// se suma abriendo el enlace y creando su cuenta como prefiera.
  Future<ClientInvitation> createInvitation({
    required String trainerId,
    required String email,
    required String fullName,
    ClientGoal? goal,
    String? healthNotes,
  }) async {
    try {
      final row = await _client
          .from('client_invitations')
          .insert({
            'trainer_id': trainerId,
            'email': email,
            'full_name': fullName,
            if (goal != null) 'goal': goal.raw,
            if (healthNotes != null && healthNotes.trim().isNotEmpty)
              'health_notes': healthNotes.trim(),
          })
          .select()
          .single();
      return ClientInvitation.fromJson(row);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  Future<void> cancelInvitation(String invitationId) async {
    try {
      await _client
          .from('client_invitations')
          .update({'status': 'cancelled'})
          .eq('id', invitationId);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  /// Actualiza los datos de un cliente. Solo se mandan las columnas que el
  /// entrenador tiene permitido tocar; intentar cambiar `role` o
  /// `trainer_id` lo rechaza la propia base de datos.
  Future<void> updateClient({
    required String clientId,
    required String fullName,
    ClientGoal? goal,
    String? healthNotes,
    String? phone,
  }) async {
    try {
      await _client
          .from('profiles')
          .update({
            'full_name': fullName.trim(),
            'goal': goal?.raw,
            'health_notes': healthNotes?.trim(),
            'phone': phone?.trim(),
          })
          .eq('id', clientId);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  /// Baja lógica: el cliente deja de aparecer como activo pero conserva
  /// todo su historial. Nunca se borra el registro.
  Future<void> setClientStatus({
    required String clientId,
    required ClientStatus status,
  }) async {
    try {
      await _client
          .from('profiles')
          .update({'status': status.raw})
          .eq('id', clientId);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }

  /// Vincula al usuario autenticado con el entrenador que generó la
  /// invitación. Ver la función `redeem_client_invitation` en Supabase.
  Future<Profile> redeemInvitation(String token) async {
    try {
      final row = await _client.rpc<Map<String, dynamic>>(
        'redeem_client_invitation',
        params: {'p_token': token},
      );
      return Profile.fromJson(row);
    } catch (error) {
      throw ClientsFailure.fromException(error);
    }
  }
}
