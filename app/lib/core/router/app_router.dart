import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/invitation_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/client/presentation/screens/client_home_screen.dart';
import '../../features/shared/models/user_role.dart';
import '../../features/shared/providers/current_user_profile_provider.dart';
import '../../features/superadmin/presentation/screens/superadmin_home_screen.dart';
import '../../features/trainer/presentation/screens/client_detail_screen.dart';
import '../../features/trainer/presentation/screens/client_form_screen.dart';
import '../../features/trainer/presentation/screens/trainer_calendar_screen.dart';
import '../../features/trainer/presentation/screens/trainer_clients_screen.dart';
import '../../features/trainer/presentation/screens/trainer_dashboard_screen.dart';
import '../../features/trainer/presentation/screens/trainer_exercise_library_screen.dart';
import '../../features/trainer/presentation/screens/trainer_nutrition_plans_screen.dart';
import '../../features/trainer/presentation/screens/trainer_programs_screen.dart';
import '../../features/trainer/presentation/screens/trainer_progress_screen.dart';
import '../../features/trainer/presentation/screens/trainer_routines_screen.dart';
import '../../features/trainer/presentation/screens/trainer_settings_screen.dart';
import '../../features/trainer/presentation/screens/trainer_shell_screen.dart';
import '../config/supabase_provider.dart';
import '../theme/app_motion.dart';
import 'app_routes.dart';

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
/// redirect sin perder la pila de navegación. El listenable se alimenta de
/// `ref.listen` sobre los mismos providers que ya usa `redirect` — nunca
/// abre su propia suscripción de Supabase en paralelo. Tener dos
/// suscripciones de Realtime independientes al mismo perfil (una aquí y
/// otra en [currentUserProfileProvider]) chocaba entre sí y dejaba las dos
/// colgadas para siempre; por eso el fix anterior con `GoRouterRefreshStream`
/// no alcanzó.
final appRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _RouterRefreshNotifier();
  ref
    ..listen(authStateChangesProvider, (_, _) => refreshNotifier.ping())
    ..listen(currentUserProfileProvider, (_, _) => refreshNotifier.ping())
    ..onDispose(refreshNotifier.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final authAsync = ref.read(authStateChangesProvider);
      if (authAsync.isLoading) return null; // resolviendo la sesión inicial

      final isAuthenticated = authAsync.valueOrNull?.session != null;
      final location = state.matchedLocation;

      // El enlace de invitación es la puerta de entrada de un cliente
      // nuevo: tiene que funcionar tanto sin sesión (para que pueda crear
      // su cuenta) como con sesión (para canjearlo), así que queda fuera
      // de la redirección normal en ambos casos.
      if (location.startsWith('/invitacion/')) return null;

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
        path: AppRoutes.invitationPattern,
        pageBuilder: (context, state) => _fadePage(
          state,
          InvitationScreen(token: state.pathParameters['token'] ?? ''),
        ),
      ),
      // Alta, detalle y edición de cliente van fuera del shell del panel
      // (no como pestañas): son pantallas completas con su propia barra y
      // botón de volver, apiladas encima del listado.
      GoRoute(
        path: AppRoutes.trainerClientNew,
        pageBuilder: (context, state) =>
            _fadePage(state, const ClientFormScreen()),
      ),
      GoRoute(
        path: '/trainer/clients/:clientId',
        pageBuilder: (context, state) => _fadePage(
          state,
          ClientDetailScreen(clientId: state.pathParameters['clientId']!),
        ),
        routes: [
          GoRoute(
            path: 'editar',
            pageBuilder: (context, state) => _fadePage(
              state,
              ClientFormScreen(clientId: state.pathParameters['clientId']),
            ),
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        pageBuilder: (context, state) =>
            _fadePage(state, const ForgotPasswordScreen()),
      ),
      _trainerShellRoute,
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

/// Shell de navegación del panel de entrenador: 9 módulos, cada uno con su
/// propia pila de navegación y estado de scroll independientes
/// (`StatefulShellRoute.indexedStack`), envueltos por [TrainerShellScreen]
/// (drawer en teléfono, rail de navegación en tablet/escritorio).
final _trainerShellRoute = StatefulShellRoute.indexedStack(
  builder: (context, state, navigationShell) =>
      TrainerShellScreen(navigationShell: navigationShell),
  branches: [
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerHome,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerDashboardScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerClients,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerClientsScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerRoutines,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerRoutinesScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerExerciseLibrary,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerExerciseLibraryScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerPrograms,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerProgramsScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerNutritionPlans,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerNutritionPlansScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerCalendar,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerCalendarScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerProgress,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerProgressScreen()),
        ),
      ],
    ),
    StatefulShellBranch(
      routes: [
        GoRoute(
          path: AppRoutes.trainerSettings,
          pageBuilder: (context, state) =>
              _fadePage(state, const TrainerSettingsScreen()),
        ),
      ],
    ),
  ],
);

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
///
/// No aplica al cambio entre módulos del panel de entrenador: ese cambio
/// usa `IndexedStack` (instantáneo, sin transición), lo correcto para una
/// navegación de pestañas que se usa decenas de veces al día.
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

/// `Listenable` mínimo para `refreshListenable`: no abre ninguna
/// suscripción propia, solo se activa cuando algo externo llama [ping]
/// (aquí, los `ref.listen` sobre los providers de auth y perfil).
class _RouterRefreshNotifier extends ChangeNotifier {
  void ping() => notifyListeners();
}
