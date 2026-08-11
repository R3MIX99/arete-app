import 'package:supabase_flutter/supabase_flutter.dart';

/// Error del módulo de clientes con un mensaje ya listo para mostrar: en
/// español, sin códigos ni jerga de base de datos.
class ClientsFailure implements Exception {
  const ClientsFailure(this.message);

  final String message;

  factory ClientsFailure.fromException(Object error) {
    if (error is ClientsFailure) return error;

    if (error is PostgrestException) {
      // Los mensajes que lanza a propósito la función de canje ya vienen
      // redactados para el usuario final; se muestran tal cual.
      if (error.code == 'P0001' || error.code == 'P0002') {
        return ClientsFailure(_withPeriod(error.message));
      }
      // 42501: la base de datos rechazó la operación por permisos. Pasa,
      // por ejemplo, si se intenta editar un cliente de otro entrenador.
      if (error.code == '42501') {
        return const ClientsFailure(
          'No tienes permiso para hacer este cambio.',
        );
      }
      if (error.code == '23505') {
        return const ClientsFailure(
          'Ya existe una invitación con ese correo electrónico.',
        );
      }
      return const ClientsFailure(
        'No se pudo completar la operación. Intenta de nuevo en unos '
        'minutos.',
      );
    }

    return const ClientsFailure(
      'No se pudo conectar. Revisa tu conexión a internet e intenta de '
      'nuevo.',
    );
  }

  static String _withPeriod(String message) {
    final trimmed = message.trim();
    if (trimmed.isEmpty) return 'No se pudo completar la operación.';
    return trimmed.endsWith('.') ? trimmed : '$trimmed.';
  }
}
