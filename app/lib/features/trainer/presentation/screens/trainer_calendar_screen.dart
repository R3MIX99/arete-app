import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Calendario de sesiones y citas con clientes.
class TrainerCalendarScreen extends StatelessWidget {
  const TrainerCalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Calendario',
      subtitle: 'Aquí verás tus sesiones y citas programadas.',
    );
  }
}
