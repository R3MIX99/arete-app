import 'package:supabase_flutter/supabase_flutter.dart';

/// Error de los módulos de biblioteca de ejercicios y rutinas, con un
/// mensaje ya listo para mostrar en español. Comparte forma con
/// `ClientsFailure` pero cubre los códigos que puede lanzar esta parte del
/// esquema (constraints de series y de video, en vez de las funciones de
/// invitación).
class CatalogFailure implements Exception {
  const CatalogFailure(this.message);

  final String message;

  factory CatalogFailure.fromException(Object error) {
    if (error is CatalogFailure) return error;

    if (error is PostgrestException) {
      switch (error.code) {
        case '23514': // check_violation
          return const CatalogFailure(
            'Alguno de los datos no es válido. Revisa el video, las '
            'repeticiones, el peso o el descanso e intenta de nuevo.',
          );
        case '23503': // foreign_key_violation
          return const CatalogFailure(
            'No puedes eliminar este ejercicio porque está usado en una '
            'rutina.',
          );
        case '42501': // insufficient_privilege
          return const CatalogFailure(
            'No tienes permiso para hacer este cambio.',
          );
        case '23505': // unique_violation
          return const CatalogFailure(
            'Ya existe un registro con esos mismos datos.',
          );
        default:
          return const CatalogFailure(
            'No se pudo completar la operación. Intenta de nuevo en unos '
            'minutos.',
          );
      }
    }

    return const CatalogFailure(
      'No se pudo conectar. Revisa tu conexión a internet e intenta de '
      'nuevo.',
    );
  }
}
