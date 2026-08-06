import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/supabase_provider.dart';
import '../models/profile.dart';

/// Perfil (tabla `profiles`) del usuario autenticado actualmente, en vivo.
///
/// Usa `.stream()` en vez de una consulta única para que, si el rol o los
/// datos del perfil cambian mientras la app está abierta (por ejemplo, un
/// superadministrador reasigna el entrenador de un cliente), la interfaz
/// se actualice sola sin que el usuario tenga que cerrar sesión.
///
/// Emite `null` mientras no haya sesión iniciada.
final currentUserProfileProvider = StreamProvider<Profile?>((ref) {
  final client = ref.watch(supabaseClientProvider);
  final authState = ref.watch(authStateChangesProvider);

  final userId = authState.valueOrNull?.session?.user.id;
  if (userId == null) {
    return Stream.value(null);
  }

  return client
      .from('profiles')
      .stream(primaryKey: ['id'])
      .eq('id', userId)
      .map((rows) => rows.isEmpty ? null : Profile.fromJson(rows.first));
});
