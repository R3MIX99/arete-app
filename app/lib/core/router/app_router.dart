import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/client/presentation/screens/client_home_screen.dart';
import '../../features/shared/models/user_role.dart';
import '../../features/shared/providers/current_user_profile_provider.dart';
import '../../features/superadmin/presentation/screens/superadmin_home_screen.dart';
import '../../features/trainer/presentation/screens/trainer_home_screen.dart';
import '../config/supabase_provider.dart';
import '../theme/app_motion.dart';
import 'app_routes.dart';
import 'go_router_refresh_stream.dart';

/// Rutas accesibles sin haber iniciado sesión.
const _publicAuthRoutes = {
  AppRoutes.login,
  AppRoutes.register,
  AppRoutes.forgotPassword,
};

/// Enrutador de la app, separado por rol.
///
/// Cada rol tiene su propio subárbol de rutas (`/trainer/...`,
/// `/client/...`, `/superadmin/...`). La redirección global evita que un
/// rol entre a rutas de otro rol o a pantallas de autenticación estando ya
/// autenticado; la autorización real de datos siempre depende además de las
/// políticas de Row Level Security en Supabase, esto es solo navegación.
///
/// El router se crea una sola vez (no se reconstruye en cada cambio de
/// sesión o de perfil): usa `refreshListenable` para volver a evaluar el
/// redirect sin perder la pila de navegación. Ver [GoRouterRefreshStream].
final appRouterProvider = Provider<GoRouter>((ref) {
  final client = ref.watch(supabaseClientProvider);

  final refreshListenable = GoRouterRefreshStream(
    client.auth.onAuthStateChange.asyncExpand((authState) {
      final userId = authState.session?.user.id;
      if (userId == null) return Stream<void>.value(null);
      return client.from('profiles').stream(primaryKey: ['id']).eq('id', userId);
    }),
  );
  ref.onDispose(refreshListenable.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authAsync = ref.read(authStateChangesProvider);
      if (authAsync.isLoading) return null; // resolviendo la sesión inicial

      final isAuthenticated = authAsync.valueOrNull?.session != null;
      final location = state.matchedLocation;

      if (!isAuthenticated) {
        return _publicAuthRoutes.contains(location) ? null : AppRoutes.login;
      }

      // Autenticado desde aquí en adelante: mientras el perfil no cargue,
      // se queda en el splash para no mostrar el panel equivocado.
      final profileAsync = ref.read(currentUserProfileProvider);
      if (profileAsync.isLoading) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      if (location == AppRoutes.splash || _publicAuthRoutes.contains(location)) {
        return _homeRouteFor(profileAsync.valueOrNull?.role);
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
        path: AppRoutes.register,
        pageBuilder: (context, state) =>
            _fadePage(state, const RegisterScreen()),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        pageBuilder: (context, state) =>
            _fadePage(state, const ForgotPasswordScreen()),
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
