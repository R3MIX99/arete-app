import 'package:supabase_flutter/supabase_flutter.dart';

/// Error de autenticación con un mensaje ya listo para mostrar al usuario
/// final: en español, sin tecnicismos ni códigos internos.
class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;

  /// Traduce una excepción cualquiera (típicamente [AuthException] o un
  /// error de red) a un mensaje que un usuario sin conocimientos técnicos
  /// pueda entender y, cuando aplica, saber cómo resolver.
  factory AuthFailure.fromException(Object error) {
    if (error is AuthFailure) return error;

    if (error is AuthException) {
      return AuthFailure(_messageForAuthException(error));
    }

    return const AuthFailure(
      'No se pudo completar la solicitud. Revisa tu conexión a internet '
      'e intenta de nuevo.',
    );
  }

  static String _messageForAuthException(AuthException error) {
    switch (error.code) {
      case 'user_already_exists':
      case 'email_exists':
        return 'Ya existe una cuenta con este correo electrónico.';
      case 'weak_password':
        return 'La contraseña es muy débil. Usa al menos 8 caracteres, '
            'combinando letras y números.';
      case 'email_not_confirmed':
        return 'Debes confirmar tu correo electrónico antes de iniciar '
            'sesión. Revisa tu bandeja de entrada.';
      case 'over_email_send_rate_limit':
        return 'Enviamos demasiados correos en poco tiempo. Espera unos '
            'minutos e intenta de nuevo.';
      case 'user_banned':
        return 'Esta cuenta no puede iniciar sesión. Contacta al '
            'administrador.';
      case 'same_password':
        return 'La nueva contraseña debe ser distinta a la actual.';
    }

    final message = error.message.toLowerCase();
    if (message.contains('invalid login credentials')) {
      return 'Correo electrónico o contraseña incorrectos.';
    }
    if (message.contains('user not found')) {
      return 'No encontramos una cuenta con este correo electrónico.';
    }
    if (message.contains('password should be at least')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (message.contains('unable to validate email') ||
        message.contains('invalid email')) {
      return 'Ese correo electrónico no es válido.';
    }

    return 'No se pudo completar la solicitud. Intenta de nuevo en unos '
        'minutos.';
  }
}
