import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_role.dart';
import 'current_user_profile_provider.dart';

/// Rol del usuario autenticado actualmente, derivado de su perfil real en
/// Supabase (ver [currentUserProfileProvider]). `null` mientras no hay
/// sesión o el perfil todavía no cargó.
final currentUserRoleProvider = Provider<UserRole?>((ref) {
  return ref.watch(currentUserProfileProvider).valueOrNull?.role;
});
