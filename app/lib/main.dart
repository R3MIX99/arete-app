import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/env_config.dart';
import 'core/config/supabase_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Red de seguridad: sin esto, una excepción fuera del árbol de widgets
  // (por ejemplo, en un stream sin manejar) se pierde en la consola del
  // navegador sin ningún contexto y la app se queda "colgada" en
  // silencio. Con esto al menos queda un registro claro de qué pasó.
  FlutterError.onError = (details) {
    debugPrint('Error no capturado: ${details.exceptionAsString()}\n${details.stack}');
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Error no capturado fuera de Flutter: $error\n$stack');
    return true;
  };

  await EnvConfig.load();
  await initSupabase();

  runApp(const ProviderScope(child: AreteApp()));
}
