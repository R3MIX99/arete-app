import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Programas: paquetes de rutinas y planes nutricionales combinados a lo
/// largo del tiempo (por ejemplo, un programa de 12 semanas).
class TrainerProgramsScreen extends StatelessWidget {
  const TrainerProgramsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Programas',
      subtitle: 'Aquí armarás programas completos de varias semanas.',
    );
  }
}
