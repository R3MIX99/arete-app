import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Biblioteca de ejercicios con demostraciones en video (enlaces de
/// YouTube).
class TrainerExerciseLibraryScreen extends StatelessWidget {
  const TrainerExerciseLibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Biblioteca de ejercicios',
      subtitle:
          'Aquí subirás ejercicios con video de referencia para tus rutinas.',
    );
  }
}
