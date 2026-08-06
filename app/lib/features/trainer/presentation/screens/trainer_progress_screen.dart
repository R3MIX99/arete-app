import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Seguimiento del progreso de cada cliente (peso, medidas, fotos,
/// cumplimiento de rutinas).
class TrainerProgressScreen extends StatelessWidget {
  const TrainerProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Seguimiento de progreso',
      subtitle: 'Aquí verás la evolución de cada cliente.',
    );
  }
}
