import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Creación y asignación de planes nutricionales.
class TrainerNutritionPlansScreen extends StatelessWidget {
  const TrainerNutritionPlansScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Planes nutricionales',
      subtitle: 'Aquí crearás y asignarás planes de alimentación.',
    );
  }
}
