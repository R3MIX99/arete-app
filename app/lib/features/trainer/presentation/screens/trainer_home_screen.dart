import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Punto de entrada del panel de entrenador. Se implementará por fases
/// (clientes, rutinas, planes de nutrición, progreso).
class TrainerHomeScreen extends StatelessWidget {
  const TrainerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Panel de entrenador',
      subtitle: 'Aquí vivirán tus clientes, rutinas y planes de nutrición.',
    );
  }
}
