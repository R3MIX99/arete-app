import 'package:flutter/material.dart';

import '../../../../core/widgets/placeholder_screen.dart';

/// Lista y gestión de clientes del entrenador. Se implementa junto con la
/// conexión real a Supabase (perfiles con `trainer_id` asignado).
class TrainerClientsScreen extends StatelessWidget {
  const TrainerClientsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderContent(
      title: 'Clientes',
      subtitle: 'Aquí verás y administrarás a todos tus clientes.',
    );
  }
}
