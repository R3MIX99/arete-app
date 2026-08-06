import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_role.dart';

/// Rol del usuario autenticado actualmente.
///
/// Placeholder para esta fase: la lectura real del rol (tabla `profiles`
/// en Supabase) se implementará junto con el módulo de autenticación. Por
/// ahora expone `null` cuando no hay sesión, para que el enrutador tenga
/// un contrato estable desde el día uno.
final currentUserRoleProvider = Provider<UserRole?>((ref) {
  return null;
});
