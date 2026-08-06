import 'package:supabase_flutter/supabase_flutter.dart';

import '../../shared/models/user_role.dart';
import 'auth_failure.dart';

/// Operaciones de autenticación de la app, con errores ya traducidos a
/// mensajes claros para el usuario final (ver [AuthFailure]).
///
/// La creación del perfil (tabla `profiles`) no ocurre aquí: la hace el
/// trigger `handle_new_user` en Supabase a partir de la metadata que se
/// manda en [signUp], así que registro y perfil siempre quedan
/// consistentes aunque la app se cierre a mitad de camino.
class AuthRepository {
  const AuthRepository(this._client);

  final SupabaseClient _client;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
    } catch (error) {
      throw AuthFailure.fromException(error);
    }
  }

  /// Registra un entrenador o un cliente nuevo. El superadministrador no
  /// puede crearse por este camino (ver [UserRole.registrable]).
  ///
  /// Devuelve `true` si el registro dejó al usuario con sesión iniciada de
  /// inmediato, o `false` si el proyecto de Supabase requiere confirmar el
  /// correo electrónico antes de poder iniciar sesión.
  Future<bool> signUp({
    required String email,
    required String password,
    required String fullName,
    required UserRole role,
    String? trainerId,
  }) async {
    assert(
      UserRole.registrable.contains(role),
      'Solo se puede registrar entrenadores y clientes desde la app.',
    );
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
        data: {
          'full_name': fullName,
          'role': role.raw,
          if (role == UserRole.client && trainerId != null)
            'trainer_id': trainerId,
        },
      );
      return response.session != null;
    } catch (error) {
      throw AuthFailure.fromException(error);
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(email);
    } catch (error) {
      throw AuthFailure.fromException(error);
    }
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (error) {
      throw AuthFailure.fromException(error);
    }
  }
}
