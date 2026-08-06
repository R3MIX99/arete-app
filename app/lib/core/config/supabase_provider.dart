import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'env_config.dart';

/// Inicializa el SDK de Supabase. Debe llamarse una sola vez antes de
/// `runApp`, después de [EnvConfig.load].
Future<void> initSupabase() async {
  await Supabase.initialize(
    url: EnvConfig.supabaseUrl,
    publishableKey: EnvConfig.supabaseAnonKey,
  );
}

/// Cliente de Supabase disponible para toda la app a través de Riverpod.
///
/// Importante: este cliente solo se usa para autenticación, lectura y
/// escritura de datos protegidos por Row Level Security. Ninguna llamada a
/// la API de Claude debe hacerse desde aquí; esas llamadas viven siempre en
/// Edge Functions (ver ai/system.md y supabase/functions).
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// Emite el estado de autenticación (sesión iniciada, cerrada, token
/// refrescado, etc.) para que el enrutador y el resto de la app reaccionen.
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client.auth.onAuthStateChange;
});
