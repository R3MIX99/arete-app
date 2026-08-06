import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Punto de entrada del panel de superadministrador. Se implementará por
/// fases (gimnasios, entrenadores, contenido de referencia para la IA).
class SuperadminHomeScreen extends StatelessWidget {
  const SuperadminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Panel de superadministrador',
      subtitle: 'Aquí vivirá la administración global de gimnasios y contenido.',
    );
  }
}
