import 'dart:async';

import 'package:flutter/foundation.dart';

/// Adapta un [Stream] a un [Listenable] para usarlo como
/// `refreshListenable` de [GoRouter].
///
/// Notifica en cada evento del stream (más una notificación inicial al
/// crearse) para que go_router vuelva a evaluar `redirect` en la ubicación
/// actual, sin reconstruir el router ni perder la pila de navegación —
/// justo lo que se necesita cuando la sesión o el perfil del usuario
/// cambian mientras la app está abierta.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
