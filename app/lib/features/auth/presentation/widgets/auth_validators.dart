/// Validaciones de formulario compartidas por login, registro y
/// recuperación de contraseña. Los mensajes están pensados para el
/// usuario final: qué está mal y qué tiene que hacer, sin tecnicismos.
class AuthValidators {
  const AuthValidators._();

  static final _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static String? email(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa tu correo electrónico.';
    if (!_emailPattern.hasMatch(trimmed)) {
      return 'Ingresa un correo electrónico válido.';
    }
    return null;
  }

  static String? password(String? value) {
    final trimmed = value ?? '';
    if (trimmed.isEmpty) return 'Ingresa tu contraseña.';
    if (trimmed.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    return null;
  }

  static String? fullName(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'Ingresa tu nombre completo.';
    if (trimmed.length < 3) return 'Ingresa tu nombre completo.';
    return null;
  }
}
