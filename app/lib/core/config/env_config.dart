import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Acceso centralizado a las variables de entorno del proyecto.
///
/// Las credenciales reales viven únicamente en el archivo `.env` (ignorado
/// por git, ver `.gitignore`). Este archivo solo expone getters tipados
/// para que el resto de la app nunca lea `dotenv` directamente.
class EnvConfig {
  const EnvConfig._();

  static String get supabaseUrl => _read('SUPABASE_URL');

  static String get supabaseAnonKey => _read('SUPABASE_ANON_KEY');

  static String _read(String key) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) {
      throw StateError(
        'Falta la variable de entorno "$key". Verifica que el archivo '
        '.env exista en la raíz de app/ y esté basado en .env.example.',
      );
    }
    return value;
  }

  /// Carga el archivo `.env`. Debe llamarse antes de `runApp`.
  static Future<void> load() => dotenv.load(fileName: '.env');
}
