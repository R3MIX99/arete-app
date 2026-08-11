import 'package:flutter/foundation.dart';

import '../../../../core/router/app_routes.dart';

/// Arma el enlace que el entrenador le comparte a su cliente.
///
/// En web se usa el origen real desde donde se está sirviendo la app, para
/// que el enlace funcione tal cual en el navegador. En móvil todavía no
/// hay un dominio propio configurado (eso llega con los enlaces profundos
/// de una fase posterior), así que se arma sobre un dominio placeholder
/// que debe reemplazarse antes de publicar.
String buildInvitationLink(String token) {
  final path = AppRoutes.invitation(token);
  if (kIsWeb) {
    return '${Uri.base.origin}$path';
  }
  return 'https://arete.app$path';
}
