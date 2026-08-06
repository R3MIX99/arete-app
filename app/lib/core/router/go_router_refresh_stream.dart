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
    _subscription = stream.asBroadcastStream().listen(
      (_) => notifyListeners(),
      // Un stream sin `onError` que emite un error se convierte en una
      // excepción no capturada en la zona actual (por ejemplo, si
      // Realtime no puede suscribirse a un cambio). No debe tumbar la
      // app: se trata igual que cualquier otro evento, para que el
      // router vuelva a evaluar el redirect con el error ya reflejado en
      // el provider correspondiente (que sí lo maneja como AsyncError).
      onError: (Object _, StackTrace _) => notifyListeners(),
    );
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
