import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Configuración de la cuenta del entrenador.
class TrainerSettingsScreen extends StatelessWidget {
  const TrainerSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Configuración',
      subtitle: 'Aquí administrarás los datos de tu cuenta.',
    );
  }
}
