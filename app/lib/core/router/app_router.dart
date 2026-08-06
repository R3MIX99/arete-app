import 'package:flutter/material.dart';
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
import '../theme/app_motion.dart';
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
        pageBuilder: (context, state) => _fadePage(state, const SplashScreen()),
      ),
      GoRoute(
        path: AppRoutes.login,
        pageBuilder: (context, state) => _fadePage(state, const LoginScreen()),
      ),
      GoRoute(
        path: AppRoutes.trainerHome,
        pageBuilder: (context, state) =>
            _fadePage(state, const TrainerHomeScreen()),
      ),
      GoRoute(
        path: AppRoutes.clientHome,
        pageBuilder: (context, state) =>
            _fadePage(state, const ClientHomeScreen()),
      ),
      GoRoute(
        path: AppRoutes.superadminHome,
        pageBuilder: (context, state) =>
            _fadePage(state, const SuperadminHomeScreen()),
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

/// Transición de página compartida por todas las rutas de nivel superior:
/// desvanecido + escala leve (nunca desde 0) al entrar, siguiendo la curva
/// de "entrada" de [AppMotion] y respetando "reducir movimiento". Se usa
/// la misma transición para todas las rutas de nivel superior porque son
/// destinos de redirección (login → panel según rol), no una pila de
/// navegación hacia adelante/atrás que necesite una dirección de
/// deslizamiento distinta.
CustomTransitionPage<void> _fadePage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: AppMotion.pageTransition,
    reverseTransitionDuration: AppMotion.pageTransition,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final reduceMotion = MediaQuery.of(context).disableAnimations;
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.enter);
      if (reduceMotion) {
        return FadeTransition(opacity: animation, child: child);
      }
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.98, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}
