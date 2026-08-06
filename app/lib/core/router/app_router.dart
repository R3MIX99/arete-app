import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/client/presentation/screens/client_home_screen.dart';
import '../../features/shared/models/user_role.dart';
import '../../features/shared/providers/current_user_role_provider.dart';
import '../../features/superadmin/presentation/screens/superadmin_home_screen.dart';
import '../../features/trainer/presentation/screens/trainer_home_screen.dart';
import '../config/supabase_provider.dart';
import 'app_routes.dart';

/// Enrutador de la app, separado por rol.
///
/// Cada rol tiene su propio subárbol de rutas (`/trainer/...`,
/// `/client/...`, `/superadmin/...`). La redirección global evita que un
/// rol entre a rutas de otro rol o a pantallas de autenticación estando ya
/// autenticado; la autorización real de datos siempre depende además de las
/// políticas de Row Level Security en Supabase, esto es solo navegación.
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateChangesProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      if (isLoading) return null;

      final session = authState.valueOrNull?.session;
      final isAuthenticated = session != null;
      final goingToLogin = state.matchedLocation == AppRoutes.login;
      final goingToSplash = state.matchedLocation == AppRoutes.splash;

      if (!isAuthenticated) {
        return goingToLogin ? null : AppRoutes.login;
      }

      // Autenticado: si sigue en login o splash, redirige a su panel.
      if (goingToLogin || goingToSplash) {
        final role = ref.read(currentUserRoleProvider);
        return _homeRouteFor(role);
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.trainerHome,
        builder: (context, state) => const TrainerHomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.clientHome,
        builder: (context, state) => const ClientHomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.superadminHome,
        builder: (context, state) => const SuperadminHomeScreen(),
      ),
    ],
  );
});

String _homeRouteFor(UserRole? role) {
  switch (role) {
    case UserRole.superadmin:
      return AppRoutes.superadminHome;
    case UserRole.trainer:
      return AppRoutes.trainerHome;
    case UserRole.client:
    case null:
      return AppRoutes.clientHome;
  }
}
