import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/auth_providers.dart';

/// Botón de cerrar sesión para la barra superior de los paneles. El
/// enrutador se encarga solo de volver a la pantalla de inicio de sesión
/// en cuanto la sesión de Supabase se cierra.
class SignOutButton extends ConsumerWidget {
  const SignOutButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(Icons.logout_outlined),
      tooltip: 'Cerrar sesión',
      onPressed: () => ref.read(authRepositoryProvider).signOut(),
    );
  }
}
