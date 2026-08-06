import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Punto de entrada del panel de cliente. Se implementará por fases
/// (entrenamiento, nutrición, progreso, perfil).
class ClientHomeScreen extends StatelessWidget {
  const ClientHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Panel de cliente',
      subtitle: 'Aquí vivirán tu rutina de hoy y tu plan de alimentación.',
    );
  }
}
