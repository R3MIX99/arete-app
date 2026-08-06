import 'package:flutter/material.dart';

/// Pantalla mostrada mientras se resuelve el estado de autenticación antes
/// de que el enrutador decida a qué panel redirigir (login, entrenador,
/// cliente o superadministrador).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
